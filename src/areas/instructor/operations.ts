import { SchoolRole, CourseLifecycleStatus, InstructorPayoutStatus, PaymentMethod } from "@prisma/client";
import { HttpError } from "wasp/server";
import { prisma } from "wasp/server";

type InstructorSchoolSummary = {
  id: string;
  name: string;
};

type InstructorCourseListItem = {
  courseId: string;
  syllabusName: string;
  syllabusVersion: number;
  startDate: Date | null;
  schoolId: string;
  schoolName: string;
  lifecycleStatus: "OPEN" | "CLOSED";
};

export type InstructorFinancialDashboardSummary = {
  pendingAmountMinor: number;
  paidAmountMinor: number;
  currency: string | null;
  payouts: {
    payoutId: string;
    courseId: string;
    courseTitle: string;
    lessonDate: Date;
    amountMinor: number;
    currency: string;
    status: InstructorPayoutStatus;
    paymentMethod: PaymentMethod | null;
    paidAt: Date | null;
  }[];
};

async function ensureInstructor(context: { user?: { id: string } | null }) {
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users can access instructor features.");
  }
  const hasRole = await prisma.userSchoolRole.findFirst({
    where: {
      userId: context.user.id,
      role: SchoolRole.INSTRUCTOR,
      revokedAt: null,
    },
    select: { id: true },
  });
  if (!hasRole) {
    throw new HttpError(403, "Only instructors can access this resource.");
  }
  return context.user;
}

export const getInstructorSchools = async (
  _args: unknown,
  context: { user?: { id: string } | null },
): Promise<InstructorSchoolSummary[]> => {
  const user = await ensureInstructor(context);
  const roles = await prisma.userSchoolRole.findMany({
    where: {
      userId: user.id,
      role: SchoolRole.INSTRUCTOR,
      revokedAt: null,
    },
    select: {
      school: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ school: { name: "asc" } }, { grantedAt: "asc" }],
  });
  return roles.map((r) => r.school);
};

export const getInstructorAssignedCourses = async (
  rawArgs: unknown,
  context: { user?: { id: string } | null },
): Promise<InstructorCourseListItem[]> => {
  const user = await ensureInstructor(context);

  const schoolId =
    rawArgs !== null &&
    rawArgs !== undefined &&
    typeof rawArgs === "object" &&
    "schoolId" in rawArgs &&
    typeof (rawArgs as { schoolId: unknown }).schoolId === "string"
      ? ((rawArgs as { schoolId: string }).schoolId.trim() || undefined)
      : undefined;

  const instructor = await prisma.instructor.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!instructor) {
    return [];
  }

  const assignments = await prisma.assignedInstructor.findMany({
    where: {
      instructorId: instructor.id,
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

  const courseIds = assignments.map((a) => a.course.id);

  const statusMap = new Map<string, "OPEN" | "CLOSED">();
  if (courseIds.length > 0) {
    const latestEvents = await prisma.courseLifecycleEvent.findMany({
      where: { courseId: { in: courseIds } },
      select: { courseId: true, status: true, createdAt: true },
      orderBy: [{ createdAt: "desc" }],
    });
    for (const event of latestEvents) {
      if (!statusMap.has(event.courseId)) {
        statusMap.set(
          event.courseId,
          event.status === CourseLifecycleStatus.CLOSED ? "CLOSED" : "OPEN",
        );
      }
    }
  }

  return assignments.map((a) => ({
    courseId: a.course.id,
    syllabusName: a.course.syllabusVersion.syllabus.name,
    syllabusVersion: a.course.syllabusVersion.version,
    startDate: a.course.startDate,
    schoolId: a.course.schoolId,
    schoolName: a.course.school.name,
    lifecycleStatus: statusMap.get(a.course.id) ?? "OPEN",
  }));
};

export const getInstructorFinancialDashboardSummary = async (
  rawArgs: unknown,
  context: { user?: { id: string } | null },
): Promise<InstructorFinancialDashboardSummary> => {
  const user = await ensureInstructor(context);

  const schoolId =
    rawArgs !== null &&
    rawArgs !== undefined &&
    typeof rawArgs === "object" &&
    "schoolId" in rawArgs &&
    typeof (rawArgs as { schoolId: unknown }).schoolId === "string"
      ? ((rawArgs as { schoolId: string }).schoolId.trim() || undefined)
      : undefined;

  const instructor = await prisma.instructor.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!instructor) {
    return {
      pendingAmountMinor: 0,
      paidAmountMinor: 0,
      currency: null,
      payouts: [],
    };
  }

  const payouts = await prisma.instructorPayout.findMany({
    where: {
      instructorId: instructor.id,
      ...(schoolId ? { schoolId } : {}),
    },
    select: {
      id: true,
      amountMinor: true,
      currency: true,
      status: true,
      paymentMethod: true,
      paidAt: true,
      courseId: true,
      courseLesson: {
        select: { date: true },
      },
      course: {
        select: {
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
    orderBy: [{ courseLesson: { date: "desc" } }, { createdAt: "desc" }],
    take: 12,
  });

  let pendingAmountMinor = 0;
  let paidAmountMinor = 0;
  for (const payout of payouts) {
    if (payout.status === InstructorPayoutStatus.PENDING) {
      pendingAmountMinor += payout.amountMinor;
    }
    if (payout.status === InstructorPayoutStatus.PAID) {
      paidAmountMinor += payout.amountMinor;
    }
  }

  return {
    pendingAmountMinor,
    paidAmountMinor,
    currency: payouts[0]?.currency ?? null,
    payouts: payouts.map((payout) => ({
      payoutId: payout.id,
      courseId: payout.courseId,
      courseTitle: `${payout.course.syllabusVersion.syllabus.name} v${payout.course.syllabusVersion.version}`,
      lessonDate: payout.courseLesson.date,
      amountMinor: payout.amountMinor,
      currency: payout.currency,
      status: payout.status,
      paymentMethod: payout.paymentMethod,
      paidAt: payout.paidAt,
    })),
  };
};
