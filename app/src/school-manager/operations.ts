import { SyllabusVersionStatus, UserRole } from "@prisma/client";
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

export const getMyManagedSchool = async (
  _args: unknown,
  context: { user?: { id: string; role?: UserRole | null } | null },
) => {
  const user = ensureSchoolManager(context);
  return getManagedSchoolForUserId(user.id);
};

export const getManagerSyllabusCatalog = async (
  _args: unknown,
  context: { user?: { id: string; role?: UserRole | null } | null },
): Promise<{
  courseOpeningCandidates: SyllabusCatalogItem[];
  editableDrafts: SyllabusCatalogItem[];
}> => {
  const user = ensureSchoolManager(context);
  const school = await getManagedSchoolForUserId(user.id);

  const versions = await prisma.syllabusVersion.findMany({
    where: {
      OR: [
        { status: SyllabusVersionStatus.FINAL },
        {
          status: SyllabusVersionStatus.DRAFT,
          syllabus: { schoolId: school.id },
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
        item.status === SyllabusVersionStatus.DRAFT && item.schoolId === school.id,
    ),
  };
};

export const getSyllabusVersionDetails = async (
  rawArgs: unknown,
  context: { user?: { id: string; role?: UserRole | null } | null },
): Promise<SyllabusVersionDetails> => {
  const user = ensureSchoolManager(context);
  const school = await getManagedSchoolForUserId(user.id);
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

  const isOwnSchoolDraft =
    version.status === SyllabusVersionStatus.DRAFT &&
    version.syllabus.schoolId === school.id;
  const isVisibleFinal = version.status === SyllabusVersionStatus.FINAL;

  if (!isOwnSchoolDraft && !isVisibleFinal) {
    throw new HttpError(403, "You are not allowed to access this syllabus version.");
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
  const user = ensureSchoolManager(context);
  const school = await getManagedSchoolForUserId(user.id);
  const { name, lessons } = ensureArgsSchemaOrThrowHttpError(
    createDraftFromScratchSchema,
    rawArgs,
  );

  const created = await prisma.$transaction(async (tx) => {
    const syllabus = await tx.syllabus.create({
      data: {
        name,
        schoolId: school.id,
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
  const user = ensureSchoolManager(context);
  const school = await getManagedSchoolForUserId(user.id);
  const { templateVersionId, name } = ensureArgsSchemaOrThrowHttpError(
    createDraftFromTemplateSchema,
    rawArgs,
  );

  const templateVersion = await prisma.syllabusVersion.findUnique({
    where: { id: templateVersionId },
    include: {
      lessons: {
        orderBy: { position: "asc" },
      },
    },
  });

  if (!templateVersion || templateVersion.status !== SyllabusVersionStatus.FINAL) {
    throw new HttpError(400, "Template must be an existing FINAL syllabus version.");
  }

  const created = await prisma.$transaction(async (tx) => {
    const syllabus = await tx.syllabus.create({
      data: {
        name,
        schoolId: school.id,
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
  const user = ensureSchoolManager(context);
  const school = await getManagedSchoolForUserId(user.id);
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

  if (
    sourceVersion.status !== SyllabusVersionStatus.DRAFT ||
    sourceVersion.syllabus.schoolId !== school.id
  ) {
    throw new HttpError(
      403,
      "Only drafts from your own school can be edited.",
    );
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
  const user = ensureSchoolManager(context);
  const school = await getManagedSchoolForUserId(user.id);
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

  if (
    sourceVersion.status !== SyllabusVersionStatus.DRAFT ||
    sourceVersion.syllabus.schoolId !== school.id
  ) {
    throw new HttpError(
      403,
      "Only drafts from your own school can be published.",
    );
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
