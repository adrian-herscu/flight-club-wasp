import { Prisma, SyllabusVersionStatus, UserRole } from "@prisma/client";
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

async function getManagedSchoolForUserId(userId: string) {
  const school = await prisma.school.findFirst({
    where: { adminId: userId },
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
  });

  if (!school) {
    throw new HttpError(403, "No managed school is assigned to this account.");
  }

  return school;
}

function ensureSchoolManager(context: { user?: { id: string; role?: UserRole | null } | null }) {
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users can access manager features.");
  }

  if (context.user.role !== UserRole.SCHOOL_MANAGER) {
    throw new HttpError(403, "Only school managers can access this resource.");
  }

  return context.user;
}

function ensureSyllabusOperator(context: {
  user?: { id: string; role?: UserRole | null } | null;
}) {
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users can access manager features.");
  }

  if (
    context.user.role !== UserRole.SCHOOL_MANAGER &&
    context.user.role !== UserRole.SYSTEM_ADMIN
  ) {
    throw new HttpError(403, "Only school managers and system admins can access this resource.");
  }

  return context.user as { id: string; role: Extract<UserRole, "SCHOOL_MANAGER" | "SYSTEM_ADMIN"> };
}

export const getMyManagedSchool = async (
  _args: unknown,
  context: { user?: { id: string; role?: UserRole | null } | null },
) => {
  const user = ensureSchoolManager(context);
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
  _args: unknown,
  context: { user?: { id: string; role?: UserRole | null } | null },
): Promise<{
  courseOpeningCandidates: SyllabusCatalogItem[];
  editableDrafts: SyllabusCatalogItem[];
}> => {
  const user = ensureSyllabusOperator(context);
  const school =
    user.role === UserRole.SCHOOL_MANAGER
      ? await getManagedSchoolForUserId(user.id)
      : null;

  const versions = await prisma.syllabusVersion.findMany({
    where: {
      OR:
        user.role === UserRole.SYSTEM_ADMIN
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
        (user.role === UserRole.SYSTEM_ADMIN
          ? item.schoolId === null
          : item.schoolId === school?.id),
    ),
  };
};

export const getSyllabusVersionDetails = async (
  rawArgs: unknown,
  context: { user?: { id: string; role?: UserRole | null } | null },
): Promise<SyllabusVersionDetails> => {
  const user = ensureSyllabusOperator(context);
  const school =
    user.role === UserRole.SCHOOL_MANAGER
      ? await getManagedSchoolForUserId(user.id)
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

  if (user.role === UserRole.SCHOOL_MANAGER) {
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
  context: { user?: { id: string; role?: UserRole | null } | null },
): Promise<{ syllabusId: string; syllabusVersionId: string }> => {
  const user = ensureSyllabusOperator(context);
  const school =
    user.role === UserRole.SCHOOL_MANAGER
      ? await getManagedSchoolForUserId(user.id)
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
          user.role === UserRole.SYSTEM_ADMIN
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
  context: { user?: { id: string; role?: UserRole | null } | null },
): Promise<{ syllabusId: string; syllabusVersionId: string }> => {
  const user = ensureSyllabusOperator(context);
  const school =
    user.role === UserRole.SCHOOL_MANAGER
      ? await getManagedSchoolForUserId(user.id)
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
    user.role === UserRole.SCHOOL_MANAGER &&
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
          user.role === UserRole.SYSTEM_ADMIN
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
  context: { user?: { id: string; role?: UserRole | null } | null },
): Promise<{ syllabusVersionId: string; version: number }> => {
  const user = ensureSyllabusOperator(context);
  const school =
    user.role === UserRole.SCHOOL_MANAGER
      ? await getManagedSchoolForUserId(user.id)
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

  const canEditDraft =
    sourceVersion.status === SyllabusVersionStatus.DRAFT &&
    (user.role === UserRole.SYSTEM_ADMIN
      ? sourceVersion.syllabus.schoolId === null
      : sourceVersion.syllabus.schoolId === school?.id);

  if (!canEditDraft) {
    throw new HttpError(403, "You can edit only drafts in your role scope.");
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
  context: { user?: { id: string; role?: UserRole | null } | null },
): Promise<{ syllabusVersionId: string; version: number }> => {
  const user = ensureSyllabusOperator(context);
  const school =
    user.role === UserRole.SCHOOL_MANAGER
      ? await getManagedSchoolForUserId(user.id)
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
    (user.role === UserRole.SYSTEM_ADMIN
      ? sourceVersion.syllabus.schoolId === null
      : sourceVersion.syllabus.schoolId === school?.id);

  if (!canPublishDraft) {
    throw new HttpError(403, "You can publish only drafts in your role scope.");
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
  _args: unknown,
  context: { user?: { id: string; role?: UserRole | null } | null },
): Promise<ManagerCourseListItem[]> => {
  const user = ensureSyllabusOperator(context);
  if (user.role === UserRole.SYSTEM_ADMIN) {
    return [];
  }
  const school = await getManagedSchoolForUserId(user.id);

  const courses = await prisma.course.findMany({
    where: {
      syllabusVersion: {
        syllabus: {
          schoolId: school.id,
        },
      },
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

  return courses.map((course) => ({
    courseId: course.id,
    syllabusName: course.syllabusVersion.syllabus.name,
    syllabusVersion: course.syllabusVersion.version,
    startDate: course.startDate,
    hourlyRate: course.hourlyRate,
    enrolledCount: course._count.enrolledStudents,
  }));
};

export const getManagerStudentsForEnrollment = async (
  _args: unknown,
  context: { user?: { id: string; role?: UserRole | null } | null },
): Promise<ManagerStudentListItem[]> => {
  const user = ensureSyllabusOperator(context);
  if (user.role === UserRole.SYSTEM_ADMIN) {
    return [];
  }
  const school = await getManagedSchoolForUserId(user.id);

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
  _args: unknown,
  context: { user?: { id: string; role?: UserRole | null } | null },
): Promise<ManagerInstructorListItem[]> => {
  const user = ensureSyllabusOperator(context);
  if (user.role === UserRole.SYSTEM_ADMIN) {
    return [];
  }
  const school = await getManagedSchoolForUserId(user.id);

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
  context: { user?: { id: string; role?: UserRole | null } | null },
): Promise<ManagerCourseEnrollmentDetails> => {
  const user = ensureSyllabusOperator(context);
  if (user.role === UserRole.SYSTEM_ADMIN) {
    return null;
  }
  const school = await getManagedSchoolForUserId(user.id);
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
      syllabusVersion: {
        syllabus: {
          schoolId: school.id,
        },
      },
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
  context: { user?: { id: string; role?: UserRole | null } | null },
): Promise<{ courseId: string; studentId: string }> => {
  const user = ensureSchoolManager(context);
  const school = await getManagedSchoolForUserId(user.id);
  const { courseId, studentId } = ensureArgsSchemaOrThrowHttpError(
    enrollStudentInCourseSchema,
    rawArgs,
  ) as EnrollStudentInCourseInput;

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      syllabusVersion: {
        syllabus: {
          schoolId: school.id,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!course) {
    throw new HttpError(404, "Course not found in your school scope.");
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
    },
  });

  if (!student) {
    throw new HttpError(404, "Student not found in your school scope.");
  }

  try {
    await prisma.enrolledStudent.create({
      data: {
        courseId,
        studentId,
      },
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
  context: { user?: { id: string; role?: UserRole | null } | null },
): Promise<ManagerCourseInstructorDetails> => {
  const user = ensureSyllabusOperator(context);
  if (user.role === UserRole.SYSTEM_ADMIN) {
    return null;
  }
  const school = await getManagedSchoolForUserId(user.id);
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
      syllabusVersion: {
        syllabus: {
          schoolId: school.id,
        },
      },
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
  context: { user?: { id: string; role?: UserRole | null } | null },
): Promise<{ courseId: string; instructorId: string }> => {
  const user = ensureSchoolManager(context);
  const school = await getManagedSchoolForUserId(user.id);
  const { courseId, instructorId } = ensureArgsSchemaOrThrowHttpError(
    assignInstructorToCourseSchema,
    rawArgs,
  ) as AssignInstructorToCourseInput;

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      syllabusVersion: {
        syllabus: {
          schoolId: school.id,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!course) {
    throw new HttpError(404, "Course not found in your school scope.");
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

  try {
    await prisma.assignedInstructor.create({
      data: {
        courseId,
        instructorId,
      },
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(409, "Instructor is already assigned to this course.");
    }
    throw error;
  }

  return {
    courseId,
    instructorId,
  };
};

export const createCourseFromFinalSyllabus = async (
  rawArgs: unknown,
  context: { user?: { id: string; role?: UserRole | null } | null },
): Promise<{ courseId: string }> => {
  const user = ensureSchoolManager(context);
  const school = await getManagedSchoolForUserId(user.id);
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
