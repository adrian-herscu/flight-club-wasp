import { CourseInterestStatus } from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import * as z from "zod";
import { getEffectiveAccountBalance } from "../../server/finance";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";

type StudentSchoolSummary = {
  id: string;
  name: string;
};

type StudentEnrolledCourseListItem = {
  courseId: string;
  syllabusName: string;
  syllabusVersion: number;
  startDate: Date | null;
  schoolId: string;
  schoolName: string;
};

export type StudentFinancialDashboardSummary = {
  balances: {
    schoolId: string;
    schoolName: string;
    currency: string;
    effectiveBalanceMinor: number;
  }[];
  recentTransactions: {
    transactionId: string;
    createdAt: Date;
    amountMinor: number;
    currency: string;
    type: "DEPOSIT" | "WITHDRAWAL";
    description: string | null;
  }[];
};

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const expressInterestInCourseSchema = z.object({
  courseId: z.string().min(1),
});

const cancelMyCourseInterestSchema = z.object({
  interestId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MyInterestItem = {
  id: string;
  status: CourseInterestStatus;
  createdAt: Date;
  updatedAt: Date;
  notes: string | null;
  course: {
    id: string;
    title: string;
    startDate: Date | null;
    schoolName: string | null;
  };
};

async function ensureStudent(context: { user?: { id: string } | null }) {
  if (!context.user) {
    throw new HttpError(401, "You must be logged in to access student features.");
  }

  const hasRole = await prisma.userSchoolRole.findFirst({
    where: {
      userId: context.user.id,
      role: "STUDENT",
      revokedAt: null,
    },
    select: { id: true },
  });

  if (!hasRole) {
    throw new HttpError(403, "Only students can access this resource.");
  }

  return context.user;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Express interest in a course. Creates a CourseInterest(INTERESTED) record
 * for the logged-in user. Idempotent — re-expressing interest on an already
 * INTERESTED record is a no-op; CANCELLED records are re-opened to INTERESTED.
 */
export const expressInterestInCourse = async (
  rawArgs: unknown,
  context: { user?: { id: string } | null },
): Promise<{ id: string; status: CourseInterestStatus }> => {
  if (!context.user) {
    throw new HttpError(401, "You must be logged in to express interest in a course.");
  }

  const { courseId } = ensureArgsSchemaOrThrowHttpError(
    expressInterestInCourseSchema,
    rawArgs,
  );

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });

  if (!course) {
    throw new HttpError(404, "Course not found.");
  }

  const existing = await prisma.courseInterest.findUnique({
    where: { courseId_userId: { courseId, userId: context.user.id } },
    select: { id: true, status: true },
  });

  if (existing) {
    if (existing.status === CourseInterestStatus.CANCELLED) {
      const updated = await prisma.courseInterest.update({
        where: { id: existing.id },
        data: { status: CourseInterestStatus.INTERESTED },
        select: { id: true, status: true },
      });
      return updated;
    }
    // Already INTERESTED or ENROLLED — return as-is.
    return { id: existing.id, status: existing.status };
  }

  const created = await prisma.courseInterest.create({
    data: {
      courseId,
      userId: context.user.id,
      status: CourseInterestStatus.INTERESTED,
    },
    select: { id: true, status: true },
  });

  return created;
};

export const cancelMyCourseInterest = async (
  rawArgs: unknown,
  context: { user?: { id: string } | null },
): Promise<{ id: string; status: CourseInterestStatus }> => {
  if (!context.user) {
    throw new HttpError(401, "You must be logged in to cancel course interest.");
  }

  const { interestId } = ensureArgsSchemaOrThrowHttpError(
    cancelMyCourseInterestSchema,
    rawArgs,
  );

  const interest = await prisma.courseInterest.findFirst({
    where: {
      id: interestId,
      userId: context.user.id,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!interest) {
    throw new HttpError(404, "Course interest not found.");
  }

  if (interest.status === CourseInterestStatus.ENROLLED) {
    throw new HttpError(409, "Enrolled course interest cannot be cancelled.");
  }

  if (interest.status === CourseInterestStatus.CANCELLED) {
    return {
      id: interest.id,
      status: interest.status,
    };
  }

  const updated = await prisma.courseInterest.update({
    where: { id: interest.id },
    data: { status: CourseInterestStatus.CANCELLED },
    select: { id: true, status: true },
  });

  return updated;
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Returns all CourseInterest records for the logged-in user, ordered by most
 * recently updated first.
 */
export const getMyInterests = async (
  _args: unknown,
  context: { user?: { id: string } | null },
): Promise<MyInterestItem[]> => {
  if (!context.user) {
    throw new HttpError(401, "You must be logged in to view your interests.");
  }

  const interests = await prisma.courseInterest.findMany({
    where: { userId: context.user.id },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      notes: true,
      course: {
        select: {
          id: true,
          startDate: true,
          school: {
            select: { name: true },
          },
          syllabusVersion: {
            select: {
              version: true,
              syllabus: {
                select: { name: true },
              },
            },
          },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return interests.map((interest) => ({
    id: interest.id,
    status: interest.status,
    createdAt: interest.createdAt,
    updatedAt: interest.updatedAt,
    notes: interest.notes,
    course: {
      id: interest.course.id,
      title: `${interest.course.syllabusVersion.syllabus.name} v${interest.course.syllabusVersion.version}`,
      startDate: interest.course.startDate,
      schoolName: interest.course.school?.name ?? null,
    },
  }));
};

export const getStudentSchools = async (
  _args: unknown,
  context: { user?: { id: string } | null },
): Promise<StudentSchoolSummary[]> => {
  const user = await ensureStudent(context);

  const roles = await prisma.userSchoolRole.findMany({
    where: {
      userId: user.id,
      role: "STUDENT",
      revokedAt: null,
    },
    select: {
      school: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ school: { name: "asc" } }, { grantedAt: "asc" }],
  });

  return roles.map((role) => role.school);
};

export const getStudentEnrolledCourses = async (
  rawArgs: unknown,
  context: { user?: { id: string } | null },
): Promise<StudentEnrolledCourseListItem[]> => {
  const user = await ensureStudent(context);

  const schoolId =
    rawArgs !== null &&
    rawArgs !== undefined &&
    typeof rawArgs === "object" &&
    "schoolId" in rawArgs &&
    typeof (rawArgs as { schoolId: unknown }).schoolId === "string"
      ? ((rawArgs as { schoolId: string }).schoolId.trim() || undefined)
      : undefined;

  const enrollments = await prisma.enrolledStudent.findMany({
    where: {
      student: {
        userId: user.id,
      },
      ...(schoolId ? { course: { schoolId } } : {}),
    },
    select: {
      course: {
        select: {
          id: true,
          startDate: true,
          schoolId: true,
          school: { select: { name: true } },
          syllabusVersion: {
            select: {
              version: true,
              syllabus: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ course: { startDate: "asc" } }],
  });

  return enrollments.map((enrollment) => ({
    courseId: enrollment.course.id,
    syllabusName: enrollment.course.syllabusVersion.syllabus.name,
    syllabusVersion: enrollment.course.syllabusVersion.version,
    startDate: enrollment.course.startDate,
    schoolId: enrollment.course.schoolId,
    schoolName: enrollment.course.school.name,
  }));
};

export const getStudentFinancialDashboardSummary = async (
  _args: unknown,
  context: { user?: { id: string } | null },
): Promise<StudentFinancialDashboardSummary> => {
  const user = await ensureStudent(context);

  const accounts = await prisma.account.findMany({
    where: {
      userId: user.id,
      school: {
        schoolRoles: {
          some: {
            userId: user.id,
            role: "STUDENT",
            revokedAt: null,
          },
        },
      },
    },
    select: {
      id: true,
      schoolId: true,
      currency: true,
      balanceMinor: true,
      school: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ school: { name: "asc" } }],
  });

  const balances = await Promise.all(
    accounts.map(async (account) => ({
      schoolId: account.schoolId,
      schoolName: account.school.name,
      currency: account.currency,
      effectiveBalanceMinor: await getEffectiveAccountBalance(
        prisma,
        account.id,
        account.balanceMinor,
      ),
    })),
  );

  const recentTransactions = await prisma.transaction.findMany({
    where: {
      accountId: {
        in: accounts.map((account) => account.id),
      },
    },
    select: {
      id: true,
      createdAt: true,
      amountMinor: true,
      currency: true,
      type: true,
      description: true,
    },
    orderBy: [{ createdAt: "desc" }],
    take: 12,
  });

  return {
    balances,
    recentTransactions: recentTransactions.map((tx) => ({
      transactionId: tx.id,
      createdAt: tx.createdAt,
      amountMinor: tx.amountMinor,
      currency: tx.currency,
      type: tx.type,
      description: tx.description,
    })),
  };
};
