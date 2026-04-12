import {
  CourseInterestStatus,
  CourseLifecycleStatus,
  Prisma,
  RegistrationRequestDecisionType,
  RegistrationRequestRole,
  RegistrationRequestStatus,
  SchoolRole,
  SyllabusVersionStatus,
} from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

const lessonInputSchema = z.object({
  position: z.number().int().positive(),
  name: z.string().trim().min(1),
  description: z.string().trim().default(""),
  durationMinutes: z.number().int().positive(),
});

const createDraftFromScratchSchema = z.object({
  name: z.string().trim().min(3),
  lessons: z.array(lessonInputSchema).min(1),
});

type CreateDraftFromScratchInput = z.infer<typeof createDraftFromScratchSchema>;

const createDraftFromTemplateSchema = z.object({
  templateVersionId: z.string().min(1),
  name: z.string().trim().min(3),
});

type CreateDraftFromTemplateInput = z.infer<typeof createDraftFromTemplateSchema>;

const syllabusVersionDetailsSchema = z.object({
  syllabusVersionId: z.string().nullable(),
});

type SyllabusVersionDetailsInput = z.infer<typeof syllabusVersionDetailsSchema>;

const saveDraftRevisionSchema = z.object({
  sourceVersionId: z.string().min(1),
  lessons: z.array(lessonInputSchema).min(1),
});

type SaveDraftRevisionInput = z.infer<typeof saveDraftRevisionSchema>;

const publishDraftSchema = z.object({
  sourceVersionId: z.string().min(1),
});

type PublishDraftInput = z.infer<typeof publishDraftSchema>;

const managerCourseEnrollmentDetailsSchema = z.object({
  courseId: z.string().nullable(),
});

type ManagerCourseEnrollmentDetailsInput = z.infer<
  typeof managerCourseEnrollmentDetailsSchema
>;

const managerCourseInstructorDetailsSchema = z.object({
  courseId: z.string().nullable(),
});

type ManagerCourseInstructorDetailsInput = z.infer<
  typeof managerCourseInstructorDetailsSchema
>;

const enrollStudentInCourseSchema = z.object({
  courseId: z.string().min(1),
  studentId: z.string().min(1),
});

type EnrollStudentInCourseInput = z.infer<typeof enrollStudentInCourseSchema>;

const assignInstructorToCourseSchema = z.object({
  courseId: z.string().min(1),
  instructorId: z.string().min(1),
  isLead: z.boolean().optional(),
  agreedWagePerHour: z.number().int().positive().optional(),
});

type AssignInstructorToCourseInput = z.infer<typeof assignInstructorToCourseSchema>;

const createCourseFromFinalSyllabusSchema = z.object({
  syllabusVersionId: z.string().min(1),
  startDate: z.string().datetime().nullable().optional(),
  minCapacity: z.number().int().positive().nullable().optional(),
  maxCapacity: z.number().int().positive().nullable().optional(),
  hourlyRate: z.number().int().positive().nullable().optional(),
});

type CreateCourseFromFinalSyllabusInput = z.infer<
  typeof createCourseFromFinalSyllabusSchema
>;

const closeCourseSchema = z.object({
  courseId: z.string().min(1),
});

type CloseCourseInput = z.infer<typeof closeCourseSchema>;

const reopenCourseSchema = z.object({
  courseId: z.string().min(1),
});

type ReopenCourseInput = z.infer<typeof reopenCourseSchema>;

const managerCourseInterestsSchema = z.object({
  courseId: z.string().nullable(),
});

type ManagerCourseInterestsInput = z.infer<typeof managerCourseInterestsSchema>;

const managerStudentCoursePairsSchema = z.object({
  courseId: z.string().nullable().optional(),
});

type ManagerStudentCoursePairsInput = z.infer<typeof managerStudentCoursePairsSchema>;

const approveStudentEnrollmentFromInterestSchema = z.object({
  interestId: z.string().min(1),
});

type ApproveStudentEnrollmentFromInterestInput = z.infer<
  typeof approveStudentEnrollmentFromInterestSchema
>;

const cancelCourseInterestForManagerSchema = z.object({
  interestId: z.string().min(1),
});

type CancelCourseInterestForManagerInput = z.infer<
  typeof cancelCourseInterestForManagerSchema
>;

export type ManagerInterestItem = {
  id: string;
  status: CourseInterestStatus;
  createdAt: Date;
  updatedAt: Date;
  notes: string | null;
  user: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
  };
  course: {
    id: string;
    title: string;
    startDate: Date | null;
  };
};

export type ManagerStudentCoursePairItem = {
  interestId: string;
  status: CourseInterestStatus;
  createdAt: Date;
  updatedAt: Date;
  student: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
  };
  course: {
    id: string;
    title: string;
    startDate: Date | null;
  };
};

type SyllabusCatalogItem = {
  syllabusId: string;
  syllabusName: string;
  schoolId: string | null;
  schoolName: string | null;
  syllabusVersionId: string;
  version: number;
  status: SyllabusVersionStatus;
  lessonCount: number;
};

type LessonDetails = {
  id: string;
  position: number;
  name: string;
  description: string;
  durationMinutes: number;
};

type SyllabusVersionDetails = {
  syllabusVersionId: string;
  syllabusId: string;
  syllabusName: string;
  status: SyllabusVersionStatus;
  version: number;
  schoolId: string | null;
  schoolName: string | null;
  lessons: LessonDetails[];
} | null;

type ManagerCourseListItem = {
  courseId: string;
  syllabusName: string;
  syllabusVersion: number;
  startDate: Date | null;
  hourlyRate: number | null;
  enrolledCount: number;
};

type ManagerStudentListItem = {
  studentId: string;
  userId: string;
  displayName: string;
  email: string | null;
  phone: string | null;
};

type ManagerInstructorListItem = {
  instructorId: string;
  userId: string;
  displayName: string;
  email: string | null;
  phone: string | null;
};

type ManagerCourseEnrollmentDetails = {
  courseId: string;
  enrolledCount: number;
  enrolledStudents: ManagerStudentListItem[];
} | null;

type ManagerCourseInstructorDetails = {
  courseId: string;
  assignedCount: number;
  assignedInstructors: ManagerInstructorListItem[];
} | null;

function getOptionalSchoolIdFromArgs(rawArgs: unknown): string | undefined {
  if (!rawArgs || typeof rawArgs !== "object") {
    return undefined;
  }

  const rawSchoolId = (rawArgs as { schoolId?: unknown }).schoolId;
  if (typeof rawSchoolId !== "string") {
    return undefined;
  }

  const trimmedSchoolId = rawSchoolId.trim();
  return trimmedSchoolId.length > 0 ? trimmedSchoolId : undefined;
}

async function getManagedSchoolForUserId(userId: string, schoolId?: string) {
  const school = await prisma.school.findFirst({
    where: {
      adminId: userId,
      ...(schoolId ? { id: schoolId } : {}),
    },
    include: {
      accounts: {
        where: { userId },
        select: {
          id: true,
          currency: true,
          balanceMinor: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  if (!school) {
    throw new HttpError(
      403,
      schoolId
        ? "Selected school is not managed by this account."
        : "No managed school is assigned to this account.",
    );
  }

  return school;
}

async function ensureSchoolManager(context: { user?: { id: string; isSystemAdmin?: boolean | null } | null }) {
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users can access manager features.");
  }

  const hasManagerRole = await prisma.userSchoolRole.findFirst({
    where: {
      userId: context.user.id,
      role: SchoolRole.SCHOOL_MANAGER,
      revokedAt: null,
    },
    select: { id: true },
  });

  if (!hasManagerRole) {
    throw new HttpError(403, "Only school managers can access this resource.");
  }

  return context.user;
}

async function ensureSyllabusOperator(context: {
  user?: { id: string; isSystemAdmin?: boolean | null } | null;
}) {
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users can access manager features.");
  }

  if (context.user.isSystemAdmin) {
    return context.user;
  }

  const hasManagerRole = await prisma.userSchoolRole.findFirst({
    where: {
      userId: context.user.id,
      role: SchoolRole.SCHOOL_MANAGER,
      revokedAt: null,
    },
    select: { id: true },
  });

  if (!hasManagerRole) {
    throw new HttpError(403, "Only school managers and system admins can access this resource.");
  }

  return context.user;
}

async function getLatestCourseLifecycleStatusByCourseIds(courseIds: string[]) {
  if (courseIds.length === 0) {
    return new Map<string, CourseLifecycleStatus>();
  }

  const lifecycleEvents = await prisma.courseLifecycleEvent.findMany({
    where: {
      courseId: {
        in: courseIds,
      },
    },
    select: {
      courseId: true,
      status: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const statusByCourseId = new Map<string, CourseLifecycleStatus>();
  for (const event of lifecycleEvents) {
    if (!statusByCourseId.has(event.courseId)) {
      statusByCourseId.set(event.courseId, event.status);
    }
  }

  return statusByCourseId;
}

async function isCourseClosed(courseId: string) {
  const latestEvent = await prisma.courseLifecycleEvent.findFirst({
    where: {
      courseId,
    },
    select: {
      status: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return latestEvent?.status === CourseLifecycleStatus.CLOSED;
}

export const getMyManagedSchool = async (
  _args: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
) => {
  const user = await ensureSchoolManager(context);
  return prisma.school.findMany({
    where: { adminId: user.id },
    include: {
      accounts: {
        where: { userId: user.id },
        select: {
          id: true,
          currency: true,
          balanceMinor: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
  });
};

export const getManagerSyllabusCatalog = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{
  courseOpeningCandidates: SyllabusCatalogItem[];
  editableDrafts: SyllabusCatalogItem[];
}> => {
  const user = await ensureSyllabusOperator(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school =
    !user.isSystemAdmin
      ? await getManagedSchoolForUserId(user.id, schoolId)
      : null;

  const versions = await prisma.syllabusVersion.findMany({
    where: {
      OR:
        user.isSystemAdmin
          ? [
              {
                status: SyllabusVersionStatus.FINAL,
              },
              {
                status: SyllabusVersionStatus.DRAFT,
                syllabus: { schoolId: null },
              },
            ]
          : [
              {
                status: SyllabusVersionStatus.FINAL,
                syllabus: {
                  OR: [{ schoolId: null }, { schoolId: school?.id ?? null }],
                },
              },
              {
                status: SyllabusVersionStatus.DRAFT,
                syllabus: { schoolId: school?.id ?? "" },
              },
            ],
    },
    include: {
      syllabus: {
        select: {
          id: true,
          name: true,
          schoolId: true,
          school: {
            select: { name: true },
          },
        },
      },
      lessons: {
        select: { id: true },
      },
    },
    orderBy: [{ syllabus: { name: "asc" } }, { version: "desc" }],
  });

  const hiddenDraftRows = await prisma.hiddenSyllabusDraft.findMany({
    where: {
      deletedByUserId: user.id,
    },
    select: {
      syllabusVersionId: true,
    },
  });
  const hiddenDraftIds = new Set(hiddenDraftRows.map((row) => row.syllabusVersionId));

  const mapped = versions.map<SyllabusCatalogItem>((version) => ({
    syllabusId: version.syllabus.id,
    syllabusName: version.syllabus.name,
    schoolId: version.syllabus.schoolId,
    schoolName: version.syllabus.school?.name ?? null,
    syllabusVersionId: version.id,
    version: version.version,
    status: version.status,
    lessonCount: version.lessons.length,
  }));

  return {
    courseOpeningCandidates: mapped.filter(
      (item) => item.status === SyllabusVersionStatus.FINAL,
    ),
    editableDrafts: mapped.filter(
      (item) =>
        item.status === SyllabusVersionStatus.DRAFT &&
        !hiddenDraftIds.has(item.syllabusVersionId) &&
        (user.isSystemAdmin
          ? item.schoolId === null
          : item.schoolId === school?.id),
    ),
  };
};

export const getSyllabusVersionDetails = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<SyllabusVersionDetails> => {
  const user = await ensureSyllabusOperator(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school =
    !user.isSystemAdmin
      ? await getManagedSchoolForUserId(user.id, schoolId)
      : null;
  const { syllabusVersionId } = ensureArgsSchemaOrThrowHttpError(
    syllabusVersionDetailsSchema,
    rawArgs,
  );

  if (!syllabusVersionId) {
    return null;
  }

  const version = await prisma.syllabusVersion.findUnique({
    where: { id: syllabusVersionId },
    include: {
      syllabus: {
        include: {
          school: {
            select: { name: true },
          },
        },
      },
      lessons: {
        orderBy: { position: "asc" },
      },
    },
  });

  if (!version) {
    throw new HttpError(404, "Syllabus version not found.");
  }

  if (version.status === SyllabusVersionStatus.DRAFT) {
    const hiddenDraft = await prisma.hiddenSyllabusDraft.findUnique({
      where: {
        deletedByUserId_syllabusVersionId: {
          deletedByUserId: user.id,
          syllabusVersionId: version.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (hiddenDraft) {
      throw new HttpError(404, "Syllabus version not found.");
    }
  }

  if (!user.isSystemAdmin) {
    const isOwnSchoolDraft =
      version.status === SyllabusVersionStatus.DRAFT &&
      version.syllabus.schoolId === school?.id;
    const isVisibleFinal =
      version.status === SyllabusVersionStatus.FINAL &&
      (version.syllabus.schoolId === null || version.syllabus.schoolId === school?.id);

    if (!isOwnSchoolDraft && !isVisibleFinal) {
      throw new HttpError(403, "You are not allowed to access this syllabus version.");
    }
  }

  return {
    syllabusVersionId: version.id,
    syllabusId: version.syllabus.id,
    syllabusName: version.syllabus.name,
    status: version.status,
    version: version.version,
    schoolId: version.syllabus.schoolId,
    schoolName: version.syllabus.school?.name ?? null,
    lessons: version.lessons.map((lesson) => ({
      id: lesson.id,
      position: lesson.position,
      name: lesson.name,
      description: lesson.description,
      durationMinutes: lesson.durationMinutes,
    })),
  };
};

export const createDraftSyllabusFromScratch = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ syllabusId: string; syllabusVersionId: string }> => {
  const user = await ensureSyllabusOperator(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school =
    !user.isSystemAdmin
      ? await getManagedSchoolForUserId(user.id, schoolId)
      : null;
  const { name, lessons } = ensureArgsSchemaOrThrowHttpError(
    createDraftFromScratchSchema,
    rawArgs,
  );

  const created = await prisma.$transaction(async (tx) => {
    const syllabus = await tx.syllabus.create({
      data: {
        name,
        schoolId:
          user.isSystemAdmin
            ? null
            : school?.id,
      },
    });

    const version = await tx.syllabusVersion.create({
      data: {
        syllabusId: syllabus.id,
        version: 1,
        status: SyllabusVersionStatus.DRAFT,
      },
    });

    await tx.syllabusLesson.createMany({
      data: lessons.map((lesson) => ({
        syllabusVersionId: version.id,
        position: lesson.position,
        name: lesson.name,
        description: lesson.description,
        durationMinutes: lesson.durationMinutes,
      })),
    });

    return { syllabusId: syllabus.id, syllabusVersionId: version.id };
  });

  return created;
};

export const createDraftSyllabusFromTemplate = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ syllabusId: string; syllabusVersionId: string }> => {
  const user = await ensureSyllabusOperator(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school =
    !user.isSystemAdmin
      ? await getManagedSchoolForUserId(user.id, schoolId)
      : null;
  const { templateVersionId, name } = ensureArgsSchemaOrThrowHttpError(
    createDraftFromTemplateSchema,
    rawArgs,
  );

  const templateVersion = await prisma.syllabusVersion.findUnique({
    where: { id: templateVersionId },
    include: {
      syllabus: {
        select: {
          schoolId: true,
        },
      },
      lessons: {
        orderBy: { position: "asc" },
      },
    },
  });

  if (!templateVersion || templateVersion.status !== SyllabusVersionStatus.FINAL) {
    throw new HttpError(400, "Template must be an existing FINAL syllabus version.");
  }

  if (
    !user.isSystemAdmin &&
    templateVersion.syllabus.schoolId !== null &&
    templateVersion.syllabus.schoolId !== school?.id
  ) {
    throw new HttpError(403, "Template is not in your school scope.");
  }

  const created = await prisma.$transaction(async (tx) => {
    const syllabus = await tx.syllabus.create({
      data: {
        name,
        schoolId:
          user.isSystemAdmin
            ? null
            : school?.id,
      },
    });

    const version = await tx.syllabusVersion.create({
      data: {
        syllabusId: syllabus.id,
        version: 1,
        status: SyllabusVersionStatus.DRAFT,
        previousVersionId: templateVersion.id,
      },
    });

    await tx.syllabusLesson.createMany({
      data: templateVersion.lessons.map((lesson) => ({
        syllabusVersionId: version.id,
        position: lesson.position,
        name: lesson.name,
        description: lesson.description,
        durationMinutes: lesson.durationMinutes,
      })),
    });

    return { syllabusId: syllabus.id, syllabusVersionId: version.id };
  });

  return created;
};

export const saveDraftSyllabusRevision = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ syllabusVersionId: string; version: number }> => {
  const user = await ensureSyllabusOperator(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school =
    !user.isSystemAdmin
      ? await getManagedSchoolForUserId(user.id, schoolId)
      : null;
  const { sourceVersionId, lessons } = ensureArgsSchemaOrThrowHttpError(
    saveDraftRevisionSchema,
    rawArgs,
  );

  const sourceVersion = await prisma.syllabusVersion.findUnique({
    where: { id: sourceVersionId },
    include: {
      syllabus: {
        select: {
          id: true,
          schoolId: true,
        },
      },
    },
  });

  if (!sourceVersion) {
    throw new HttpError(404, "Draft syllabus version not found.");
  }

  const canSaveRevisionFromSource =
    (sourceVersion.status === SyllabusVersionStatus.DRAFT ||
      sourceVersion.status === SyllabusVersionStatus.FINAL) &&
    (user.isSystemAdmin
      ? sourceVersion.syllabus.schoolId === null
      : sourceVersion.syllabus.schoolId === school?.id);

  if (!canSaveRevisionFromSource) {
    throw new HttpError(403, "You can save revisions only in your role scope.");
  }

  const created = await prisma.$transaction(async (tx) => {
    const latestVersion = await tx.syllabusVersion.findFirst({
      where: { syllabusId: sourceVersion.syllabusId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (latestVersion?.version ?? 0) + 1;

    const newVersion = await tx.syllabusVersion.create({
      data: {
        syllabusId: sourceVersion.syllabusId,
        version: nextVersion,
        status: SyllabusVersionStatus.DRAFT,
        previousVersionId: sourceVersion.id,
      },
    });

    await tx.syllabusLesson.createMany({
      data: lessons.map((lesson) => ({
        syllabusVersionId: newVersion.id,
        position: lesson.position,
        name: lesson.name,
        description: lesson.description,
        durationMinutes: lesson.durationMinutes,
      })),
    });

    return { syllabusVersionId: newVersion.id, version: nextVersion };
  });

  return created;
};

export const publishDraftSyllabusVersion = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ syllabusVersionId: string; version: number }> => {
  const user = await ensureSyllabusOperator(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school =
    !user.isSystemAdmin
      ? await getManagedSchoolForUserId(user.id, schoolId)
      : null;
  const { sourceVersionId } = ensureArgsSchemaOrThrowHttpError(
    publishDraftSchema,
    rawArgs,
  );

  const sourceVersion = await prisma.syllabusVersion.findUnique({
    where: { id: sourceVersionId },
    include: {
      syllabus: {
        select: {
          id: true,
          schoolId: true,
        },
      },
      lessons: {
        orderBy: { position: "asc" },
      },
    },
  });

  if (!sourceVersion) {
    throw new HttpError(404, "Draft syllabus version not found.");
  }

  const canPublishDraft =
    sourceVersion.status === SyllabusVersionStatus.DRAFT &&
    (user.isSystemAdmin
      ? sourceVersion.syllabus.schoolId === null
      : sourceVersion.syllabus.schoolId === school?.id);

  if (!canPublishDraft) {
    throw new HttpError(403, "You can publish only drafts in your role scope.");
  }

  if (sourceVersion.lessons.length === 0) {
    throw new HttpError(400, "Cannot publish a FINAL syllabus version without lessons.");
  }

  const created = await prisma.$transaction(async (tx) => {
    const latestVersion = await tx.syllabusVersion.findFirst({
      where: { syllabusId: sourceVersion.syllabusId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (latestVersion?.version ?? 0) + 1;

    const finalVersion = await tx.syllabusVersion.create({
      data: {
        syllabusId: sourceVersion.syllabusId,
        version: nextVersion,
        status: SyllabusVersionStatus.FINAL,
        previousVersionId: sourceVersion.id,
      },
    });

    await tx.syllabusLesson.createMany({
      data: sourceVersion.lessons.map((lesson) => ({
        syllabusVersionId: finalVersion.id,
        position: lesson.position,
        name: lesson.name,
        description: lesson.description,
        durationMinutes: lesson.durationMinutes,
      })),
    });

    return { syllabusVersionId: finalVersion.id, version: nextVersion };
  });

  return created;
};

export const getManagerCoursesForEnrollment = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<ManagerCourseListItem[]> => {
  const user = await ensureSyllabusOperator(context);
  if (user.isSystemAdmin) {
    return [];
  }
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);

  const courses = await prisma.course.findMany({
    where: {
      schoolId: school.id,
    },
    include: {
      syllabusVersion: {
        include: {
          syllabus: {
            select: {
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          enrolledStudents: true,
        },
      },
    },
    orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
  });

  const latestStatusByCourseId = await getLatestCourseLifecycleStatusByCourseIds(
    courses.map((course) => course.id),
  );

  return courses
    .filter((course) => latestStatusByCourseId.get(course.id) !== CourseLifecycleStatus.CLOSED)
    .map((course) => ({
      courseId: course.id,
      syllabusName: course.syllabusVersion.syllabus.name,
      syllabusVersion: course.syllabusVersion.version,
      startDate: course.startDate,
      hourlyRate: course.hourlyRate,
      enrolledCount: course._count.enrolledStudents,
    }));
};

export const getManagerClosedCourses = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<ManagerCourseListItem[]> => {
  const user = await ensureSyllabusOperator(context);
  if (user.isSystemAdmin) {
    return [];
  }
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);

  const courses = await prisma.course.findMany({
    where: {
      schoolId: school.id,
    },
    include: {
      syllabusVersion: {
        include: {
          syllabus: {
            select: {
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          enrolledStudents: true,
        },
      },
    },
    orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
  });

  const latestStatusByCourseId = await getLatestCourseLifecycleStatusByCourseIds(
    courses.map((course) => course.id),
  );

  return courses
    .filter((course) => latestStatusByCourseId.get(course.id) === CourseLifecycleStatus.CLOSED)
    .map((course) => ({
      courseId: course.id,
      syllabusName: course.syllabusVersion.syllabus.name,
      syllabusVersion: course.syllabusVersion.version,
      startDate: course.startDate,
      hourlyRate: course.hourlyRate,
      enrolledCount: course._count.enrolledStudents,
    }));
};

export const getManagerStudentsForEnrollment = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<ManagerStudentListItem[]> => {
  const user = await ensureSyllabusOperator(context);
  if (user.isSystemAdmin) {
    return [];
  }
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);

  const students = await prisma.student.findMany({
    where: {
      user: {
        accounts: {
          some: {
            schoolId: school.id,
          },
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return students.map((student) => ({
    studentId: student.id,
    userId: student.user.id,
    displayName: student.user.fullName ?? student.user.email ?? student.id,
    email: student.user.email,
    phone: student.user.phone,
  }));
};

export const getManagerInstructorsForAssignment = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<ManagerInstructorListItem[]> => {
  const user = await ensureSyllabusOperator(context);
  if (user.isSystemAdmin) {
    return [];
  }
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);

  const instructors = await prisma.instructor.findMany({
    where: {
      user: {
        accounts: {
          some: {
            schoolId: school.id,
          },
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return instructors.map((instructor) => ({
    instructorId: instructor.id,
    userId: instructor.user.id,
    displayName: instructor.user.fullName ?? instructor.user.email ?? instructor.id,
    email: instructor.user.email,
    phone: instructor.user.phone,
  }));
};

export const getManagerCourseEnrollmentDetails = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<ManagerCourseEnrollmentDetails> => {
  const user = await ensureSyllabusOperator(context);
  if (user.isSystemAdmin) {
    return null;
  }
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);
  const { courseId } = ensureArgsSchemaOrThrowHttpError(
    managerCourseEnrollmentDetailsSchema,
    rawArgs,
  ) as ManagerCourseEnrollmentDetailsInput;

  if (!courseId) {
    return null;
  }

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      schoolId: school.id,
    },
    include: {
      enrolledStudents: {
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new HttpError(404, "Course not found in your school scope.");
  }

  const enrolledStudents = course.enrolledStudents
    .map((enrollment) => ({
      studentId: enrollment.student.id,
      userId: enrollment.student.user.id,
      displayName:
        enrollment.student.user.fullName ??
        enrollment.student.user.email ??
        enrollment.student.id,
      email: enrollment.student.user.email,
      phone: enrollment.student.user.phone,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return {
    courseId: course.id,
    enrolledCount: enrolledStudents.length,
    enrolledStudents,
  };
};

export const enrollStudentInCourse = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ courseId: string; studentId: string }> => {
  const user = await ensureSchoolManager(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);
  const { courseId, studentId } = ensureArgsSchemaOrThrowHttpError(
    enrollStudentInCourseSchema,
    rawArgs,
  ) as EnrollStudentInCourseInput;

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      schoolId: school.id,
    },
    select: {
      id: true,
    },
  });

  if (!course) {
    throw new HttpError(404, "Course not found in your school scope.");
  }

  if (await isCourseClosed(course.id)) {
    throw new HttpError(409, "Course is closed and cannot accept new enrollments.");
  }

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      user: {
        accounts: {
          some: {
            schoolId: school.id,
          },
        },
      },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!student) {
    throw new HttpError(404, "Student not found in your school scope.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.enrolledStudent.create({
        data: {
          courseId,
          studentId,
        },
      });

      await tx.courseInterest.upsert({
        where: {
          courseId_userId: {
            courseId,
            userId: student.userId,
          },
        },
        update: {
          status: CourseInterestStatus.ENROLLED,
        },
        create: {
          courseId,
          userId: student.userId,
          status: CourseInterestStatus.ENROLLED,
        },
      });
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(409, "Student is already enrolled in this course.");
    }
    throw error;
  }

  return {
    courseId,
    studentId,
  };
};

export const getManagerCourseInstructorDetails = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<ManagerCourseInstructorDetails> => {
  const user = await ensureSyllabusOperator(context);
  if (user.isSystemAdmin) {
    return null;
  }
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);
  const { courseId } = ensureArgsSchemaOrThrowHttpError(
    managerCourseInstructorDetailsSchema,
    rawArgs,
  ) as ManagerCourseInstructorDetailsInput;

  if (!courseId) {
    return null;
  }

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      schoolId: school.id,
    },
    include: {
      assignedInstructors: {
        include: {
          instructor: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new HttpError(404, "Course not found in your school scope.");
  }

  const assignedInstructors = course.assignedInstructors
    .map((assignment) => ({
      instructorId: assignment.instructor.id,
      userId: assignment.instructor.user.id,
      displayName:
        assignment.instructor.user.fullName ??
        assignment.instructor.user.email ??
        assignment.instructor.id,
      email: assignment.instructor.user.email,
      phone: assignment.instructor.user.phone,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return {
    courseId: course.id,
    assignedCount: assignedInstructors.length,
    assignedInstructors,
  };
};

export const assignInstructorToCourse = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ courseId: string; instructorId: string }> => {
  const user = await ensureSchoolManager(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);
  const { courseId, instructorId, isLead, agreedWagePerHour } = ensureArgsSchemaOrThrowHttpError(
    assignInstructorToCourseSchema,
    rawArgs,
  ) as AssignInstructorToCourseInput;

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      schoolId: school.id,
    },
    select: {
      id: true,
    },
  });

  if (!course) {
    throw new HttpError(404, "Course not found in your school scope.");
  }

  if (await isCourseClosed(course.id)) {
    throw new HttpError(
      409,
      "Course is closed and cannot accept new instructor assignments.",
    );
  }

  const instructor = await prisma.instructor.findFirst({
    where: {
      id: instructorId,
      user: {
        accounts: {
          some: {
            schoolId: school.id,
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!instructor) {
    throw new HttpError(404, "Instructor not found in your school scope.");
  }

  // Enforce INV-16: if isLead=true, clear any existing lead before assigning the new one.
  if (isLead) {
    await prisma.assignedInstructor.updateMany({
      where: { courseId, isLead: true },
      data: { isLead: false },
    });
  }

  await prisma.assignedInstructor.upsert({
    where: { courseId_instructorId: { courseId, instructorId } },
    create: {
      courseId,
      instructorId,
      isLead: isLead ?? false,
      agreedWagePerHour: agreedWagePerHour ?? null,
    },
    update: {
      isLead: isLead ?? false,
      agreedWagePerHour: agreedWagePerHour ?? null,
    },
  });

  return {
    courseId,
    instructorId,
  };
};

export const createCourseFromFinalSyllabus = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ courseId: string }> => {
  const user = await ensureSchoolManager(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);
  const {
    syllabusVersionId,
    startDate,
    minCapacity,
    maxCapacity,
    hourlyRate,
  } = ensureArgsSchemaOrThrowHttpError(
    createCourseFromFinalSyllabusSchema,
    rawArgs,
  ) as CreateCourseFromFinalSyllabusInput;

  const resolvedHourlyRate = hourlyRate ?? school.defaultHourlyRate ?? null;

  if (resolvedHourlyRate == null) {
    throw new HttpError(
      400,
      "Missing hourly rate. Set school default hourly rate or provide a course hourly rate.",
    );
  }

  if (
    minCapacity != null &&
    maxCapacity != null &&
    minCapacity > maxCapacity
  ) {
    throw new HttpError(400, "minCapacity cannot be greater than maxCapacity.");
  }

  const finalVersion = await prisma.syllabusVersion.findFirst({
    where: {
      id: syllabusVersionId,
      status: SyllabusVersionStatus.FINAL,
      syllabus: {
        OR: [{ schoolId: null }, { schoolId: school.id }],
      },
    },
    select: {
      id: true,
    },
  });

  if (!finalVersion) {
    throw new HttpError(
      404,
      "FINAL syllabus version not found in your manager scope.",
    );
  }

  const created = await prisma.course.create({
    data: {
      syllabusVersionId,
      schoolId: school.id,
      startDate: startDate ? new Date(startDate) : null,
      minCapacity: minCapacity ?? null,
      maxCapacity: maxCapacity ?? null,
      hourlyRate: resolvedHourlyRate,
    },
    select: {
      id: true,
    },
  });

  return {
    courseId: created.id,
  };
};

export const closeCourse = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ courseId: string; status: CourseLifecycleStatus }> => {
  const user = await ensureSchoolManager(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);
  const { courseId } = ensureArgsSchemaOrThrowHttpError(
    closeCourseSchema,
    rawArgs,
  ) as CloseCourseInput;

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      schoolId: school.id,
    },
    select: {
      id: true,
    },
  });

  if (!course) {
    throw new HttpError(404, "Course not found in your school scope.");
  }

  const latestCloseEvent = await prisma.courseLifecycleEvent.findFirst({
    where: { courseId: course.id },
    orderBy: { createdAt: 'desc' },
    select: { status: true },
  });
  const latestStatus = latestCloseEvent?.status ?? null;

  if (latestStatus === CourseLifecycleStatus.COMPLETED) {
    throw new HttpError(409, 'Course is already completed and cannot be closed.');
  }

  if (latestStatus === CourseLifecycleStatus.CLOSED) {
    return { courseId: course.id, status: CourseLifecycleStatus.CLOSED };
  }

  await prisma.courseLifecycleEvent.create({
    data: {
      courseId: course.id,
      changedByUserId: user.id,
      status: CourseLifecycleStatus.CLOSED,
    },
  });

  return { courseId: course.id, status: CourseLifecycleStatus.CLOSED };
};

export const reopenCourse = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ courseId: string; status: CourseLifecycleStatus }> => {
  const user = await ensureSchoolManager(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);
  const { courseId } = ensureArgsSchemaOrThrowHttpError(
    reopenCourseSchema,
    rawArgs,
  ) as ReopenCourseInput;

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      schoolId: school.id,
    },
    select: {
      id: true,
    },
  });

  if (!course) {
    throw new HttpError(404, "Course not found in your school scope.");
  }

  if (!(await isCourseClosed(course.id))) {
    return { courseId: course.id, status: CourseLifecycleStatus.REOPENED };
  }

  await prisma.courseLifecycleEvent.create({
    data: {
      courseId: course.id,
      changedByUserId: user.id,
      status: CourseLifecycleStatus.REOPENED,
    },
  });

  return { courseId: course.id, status: CourseLifecycleStatus.REOPENED };
};

// ---------------------------------------------------------------------------
// Course Interest (manager-side)
// ---------------------------------------------------------------------------

function buildManagedSchoolCourseFilter(schoolId: string) {
  return { schoolId };
}

async function ensureApprovedStudentRegistrationRequestId(
  tx: Prisma.TransactionClient,
  args: {
    requesterId: string;
    schoolId: string;
    reviewerId: string;
  },
): Promise<string> {
  const approvedRequest = await tx.registrationRequest.findFirst({
    where: {
      requesterId: args.requesterId,
      targetSchoolId: args.schoolId,
      requestedRole: RegistrationRequestRole.STUDENT,
      status: RegistrationRequestStatus.APPROVED,
    },
    select: { id: true },
    orderBy: [{ reviewedAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
  });

  if (approvedRequest) {
    return approvedRequest.id;
  }

  const pendingRequest = await tx.registrationRequest.findFirst({
    where: {
      requesterId: args.requesterId,
      targetSchoolId: args.schoolId,
      requestedRole: RegistrationRequestRole.STUDENT,
      status: RegistrationRequestStatus.PENDING,
    },
    select: { id: true },
    orderBy: [{ createdAt: "asc" }],
  });

  if (pendingRequest) {
    await tx.registrationRequest.update({
      where: { id: pendingRequest.id },
      data: {
        status: RegistrationRequestStatus.APPROVED,
        reviewerId: args.reviewerId,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    });

    await tx.registrationRequestDecision.upsert({
      where: { requestId: pendingRequest.id },
      update: {
        decisionType: RegistrationRequestDecisionType.APPROVED,
        reviewerId: args.reviewerId,
        reason: null,
      },
      create: {
        requestId: pendingRequest.id,
        decisionType: RegistrationRequestDecisionType.APPROVED,
        reviewerId: args.reviewerId,
      },
    });

    return pendingRequest.id;
  }

  const createdRequest = await tx.registrationRequest.create({
    data: {
      requesterId: args.requesterId,
      requestedRole: RegistrationRequestRole.STUDENT,
      status: RegistrationRequestStatus.APPROVED,
      targetSchoolId: args.schoolId,
      reviewerId: args.reviewerId,
      reviewedAt: new Date(),
    },
    select: { id: true },
  });

  await tx.registrationRequestDecision.create({
    data: {
      requestId: createdRequest.id,
      decisionType: RegistrationRequestDecisionType.APPROVED,
      reviewerId: args.reviewerId,
    },
  });

  return createdRequest.id;
}

/**
 * Returns student-course pairs sourced from CourseInterest records in the
 * manager's school scope. Includes actionable pending and enrolled states.
 */
export const getManagerStudentCoursePairs = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<ManagerStudentCoursePairItem[]> => {
  const user = await ensureSchoolManager(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);

  const args = ensureArgsSchemaOrThrowHttpError(
    managerStudentCoursePairsSchema,
    rawArgs,
  ) as ManagerStudentCoursePairsInput;

  const interests = await prisma.courseInterest.findMany({
    where: {
      status: {
        in: [CourseInterestStatus.INTERESTED, CourseInterestStatus.ENROLLED],
      },
      course: {
        ...buildManagedSchoolCourseFilter(school.id),
        ...(args.courseId ? { id: args.courseId } : {}),
      },
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
      course: {
        select: {
          id: true,
          startDate: true,
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
    orderBy: [{ createdAt: "asc" }],
  });

  return interests.map((interest) => ({
    interestId: interest.id,
    status: interest.status,
    createdAt: interest.createdAt,
    updatedAt: interest.updatedAt,
    student: {
      id: interest.user.id,
      fullName: interest.user.fullName,
      email: interest.user.email,
      phone: interest.user.phone,
    },
    course: {
      id: interest.course.id,
      title: `${interest.course.syllabusVersion.syllabus.name} v${interest.course.syllabusVersion.version}`,
      startDate: interest.course.startDate,
    },
  }));
};

/**
 * Approves enrollment from a CourseInterest row. Ensures manager school scope,
 * STUDENT capability source request integrity, Student profile, Account,
 * EnrolledStudent row (idempotent), and updates interest status to ENROLLED.
 */
export const approveStudentEnrollmentFromInterest = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ interestId: string; status: CourseInterestStatus }> => {
  const user = await ensureSchoolManager(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);

  const { interestId } = ensureArgsSchemaOrThrowHttpError(
    approveStudentEnrollmentFromInterestSchema,
    rawArgs,
  ) as ApproveStudentEnrollmentFromInterestInput;

  return prisma.$transaction(async (tx) => {
    const interest = await tx.courseInterest.findFirst({
      where: {
        id: interestId,
        course: buildManagedSchoolCourseFilter(school.id),
      },
      select: {
        id: true,
        status: true,
        userId: true,
        courseId: true,
      },
    });

    if (!interest) {
      throw new HttpError(404, "Course interest not found in your school scope.");
    }

    if (interest.status === CourseInterestStatus.CANCELLED) {
      throw new HttpError(409, "Cancelled interest cannot be enrolled.");
    }

    const latestLifecycleEvent = await tx.courseLifecycleEvent.findFirst({
      where: { courseId: interest.courseId },
      select: { status: true },
      orderBy: [{ createdAt: "desc" }],
    });

    if (latestLifecycleEvent?.status === CourseLifecycleStatus.CLOSED) {
      throw new HttpError(409, "Course is closed and cannot accept new enrollments.");
    }

    const existingStudentRole = await tx.userSchoolRole.findUnique({
      where: {
        userId_schoolId_role: {
          userId: interest.userId,
          schoolId: school.id,
          role: SchoolRole.STUDENT,
        },
      },
      select: {
        id: true,
        sourceRegistrationRequestId: true,
      },
    });

    const sourceRegistrationRequestId =
      existingStudentRole?.sourceRegistrationRequestId ??
      (await ensureApprovedStudentRegistrationRequestId(tx, {
        requesterId: interest.userId,
        schoolId: school.id,
        reviewerId: user.id,
      }));

    await tx.userSchoolRole.upsert({
      where: {
        userId_schoolId_role: {
          userId: interest.userId,
          schoolId: school.id,
          role: SchoolRole.STUDENT,
        },
      },
      update: {
        revokedAt: null,
        grantedByUserId: user.id,
        sourceRegistrationRequestId,
      },
      create: {
        userId: interest.userId,
        schoolId: school.id,
        role: SchoolRole.STUDENT,
        grantedByUserId: user.id,
        sourceRegistrationRequestId,
      },
    });

    const student = await tx.student.upsert({
      where: { userId: interest.userId },
      update: {},
      create: { userId: interest.userId },
      select: { id: true },
    });

    await tx.account.upsert({
      where: {
        userId_schoolId: {
          userId: interest.userId,
          schoolId: school.id,
        },
      },
      update: {},
      create: {
        userId: interest.userId,
        schoolId: school.id,
        currency: school.currency,
      },
    });

    const existingEnrollment = await tx.enrolledStudent.findUnique({
      where: {
        courseId_studentId: {
          courseId: interest.courseId,
          studentId: student.id,
        },
      },
      select: { courseId: true },
    });

    if (!existingEnrollment) {
      await tx.enrolledStudent.create({
        data: {
          courseId: interest.courseId,
          studentId: student.id,
        },
      });
    }

    const updatedInterest = await tx.courseInterest.update({
      where: { id: interest.id },
      data: { status: CourseInterestStatus.ENROLLED },
      select: { id: true, status: true },
    });

    return {
      interestId: updatedInterest.id,
      status: updatedInterest.status,
    };
  });
};

/**
 * Returns CourseInterest records for the manager's school, filtered by an
 * optional courseId. Only actionable INTERESTED records are returned (ENROLLED/CANCELLED are excluded).
 */
export const getManagerCourseInterests = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<ManagerInterestItem[]> => {
  const user = await ensureSchoolManager(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);

  const args = ensureArgsSchemaOrThrowHttpError(
    managerCourseInterestsSchema,
    rawArgs,
  ) as ManagerCourseInterestsInput;

  const interests = await prisma.courseInterest.findMany({
    where: {
      status: { in: [CourseInterestStatus.INTERESTED] },
      course: {
        ...buildManagedSchoolCourseFilter(school.id),
        ...(args.courseId ? { id: args.courseId } : {}),
      },
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      notes: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
      course: {
        select: {
          id: true,
          startDate: true,
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
    orderBy: [{ createdAt: "asc" }],
  });

  return interests.map((interest) => ({
    id: interest.id,
    status: interest.status,
    createdAt: interest.createdAt,
    updatedAt: interest.updatedAt,
    notes: interest.notes,
    user: {
      id: interest.user.id,
      fullName: interest.user.fullName,
      email: interest.user.email,
      phone: interest.user.phone,
    },
    course: {
      id: interest.course.id,
      title: `${interest.course.syllabusVersion.syllabus.name} v${interest.course.syllabusVersion.version}`,
      startDate: interest.course.startDate,
    },
  }));
};


export const cancelCourseInterestForManager = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ id: string; status: CourseInterestStatus }> => {
  const user = await ensureSchoolManager(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);

  const { interestId } = ensureArgsSchemaOrThrowHttpError(
    cancelCourseInterestForManagerSchema,
    rawArgs,
  ) as CancelCourseInterestForManagerInput;

  const interest = await prisma.courseInterest.findFirst({
    where: {
      id: interestId,
      course: buildManagedSchoolCourseFilter(school.id),
    },
    select: { id: true, status: true },
  });

  if (!interest) {
    throw new HttpError(404, "Course interest not found in your school scope.");
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
