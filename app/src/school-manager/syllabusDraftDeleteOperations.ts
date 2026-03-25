import { SchoolRole, SyllabusVersionStatus } from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

const deleteDraftSchema = z.object({
  sourceVersionId: z.string().min(1),
});

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
    select: {
      id: true,
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

export const deleteDraftSyllabusVersion = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ deletedSyllabusVersionId: string }> => {
  const user = await ensureSyllabusOperator(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = !user.isSystemAdmin
    ? await getManagedSchoolForUserId(user.id, schoolId)
    : null;
  const { sourceVersionId } = ensureArgsSchemaOrThrowHttpError(
    deleteDraftSchema,
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
      _count: {
        select: {
          courses: true,
        },
      },
    },
  });

  if (!sourceVersion) {
    throw new HttpError(404, "Draft syllabus version not found.");
  }

  const canDeleteDraft =
    sourceVersion.status === SyllabusVersionStatus.DRAFT &&
    (user.isSystemAdmin
      ? sourceVersion.syllabus.schoolId === null
      : sourceVersion.syllabus.schoolId === school?.id);

  if (!canDeleteDraft) {
    throw new HttpError(403, "You can delete only drafts in your role scope.");
  }

  if (sourceVersion._count.courses > 0) {
    throw new HttpError(409, "Draft cannot be deleted because it is already used by courses.");
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.hiddenSyllabusDraft.upsert({
      where: {
        deletedByUserId_syllabusVersionId: {
          deletedByUserId: user.id,
          syllabusVersionId: sourceVersion.id,
        },
      },
      update: {},
      create: {
        deletedByUserId: user.id,
        syllabusVersionId: sourceVersion.id,
      },
    });

    return {
      deletedSyllabusVersionId: sourceVersion.id,
    };
  });

  return result;
};

export const deleteAllEditableDraftSyllabusVersions = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ deletedCount: number; skippedInUseCount: number }> => {
  const user = await ensureSyllabusOperator(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = !user.isSystemAdmin
    ? await getManagedSchoolForUserId(user.id, schoolId)
    : null;

  const editableDrafts = await prisma.syllabusVersion.findMany({
    where: {
      status: SyllabusVersionStatus.DRAFT,
      syllabus: {
        schoolId: user.isSystemAdmin ? null : school?.id,
      },
    },
    include: {
      _count: {
        select: {
          courses: true,
        },
      },
    },
  });

  const deletableDrafts = editableDrafts.filter((draft) => draft._count.courses === 0);
  const skippedInUseCount = editableDrafts.length - deletableDrafts.length;

  if (deletableDrafts.length === 0) {
    return {
      deletedCount: 0,
      skippedInUseCount,
    };
  }

  const deletedCount = await prisma.$transaction(async (tx) => {
    if (deletableDrafts.length === 0) {
      return 0;
    }

    const deletableDraftIds = deletableDrafts.map((draft) => draft.id);

    const alreadyHidden = await tx.hiddenSyllabusDraft.findMany({
      where: {
        deletedByUserId: user.id,
        syllabusVersionId: { in: deletableDraftIds },
      },
      select: {
        syllabusVersionId: true,
      },
    });

    const alreadyHiddenIds = new Set(alreadyHidden.map((item) => item.syllabusVersionId));
    const draftsToHide = deletableDraftIds.filter((id) => !alreadyHiddenIds.has(id));

    if (draftsToHide.length > 0) {
      await tx.hiddenSyllabusDraft.createMany({
        data: draftsToHide.map((syllabusVersionId) => ({
          deletedByUserId: user.id,
          syllabusVersionId,
        })),
      });
    }

    return draftsToHide.length;
  });

  return {
    deletedCount,
    skippedInUseCount,
  };
};
