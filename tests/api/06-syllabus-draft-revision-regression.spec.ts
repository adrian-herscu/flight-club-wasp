import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

import {
  createDraftSyllabusFromTemplate,
  getSyllabusVersionDetails,
  publishDraftSyllabusVersion,
  saveDraftSyllabusRevision,
} from '../../src/school-manager/operations.js';
import { ctx, SEED } from './testHelpers.js';
import { prisma } from './wasp-server-stub.js';

const FINAL_SYSTEM_SYLLABUS_VERSION_ID = 'seed-syllabus-version-tandem-flights-v1';

describe('4.10 syllabus draft revision regression (API)', () => {
  it('[STD-SYL-005][STD-SYL-010] allows saving a new DRAFT revision after editing a manager-owned FINAL version', async () => {
    const uniqueName = `Regression syllabus ${Date.now()}`;

    const createdDraft = await createDraftSyllabusFromTemplate(
      {
        schoolId: SEED.schools.cloudbase,
        templateVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        name: uniqueName,
      },
      ctx.schoolManager,
    );

    const published = await publishDraftSyllabusVersion(
      {
        schoolId: SEED.schools.cloudbase,
        sourceVersionId: createdDraft.syllabusVersionId,
      },
      ctx.schoolManager,
    );

    const finalDetails = await getSyllabusVersionDetails(
      {
        schoolId: SEED.schools.cloudbase,
        syllabusVersionId: published.syllabusVersionId,
      },
      ctx.schoolManager,
    );

    expect(finalDetails).not.toBeNull();

    const editedLessons = (finalDetails?.lessons ?? [])
      .slice(1)
      .map((lesson, index) => ({
        position: index + 1,
        name: lesson.name,
        description: lesson.description,
        durationMinutes: lesson.durationMinutes,
      }));

    editedLessons.push({
      position: editedLessons.length + 1,
      name: 'Added in regression test',
      description: 'Should be persisted in a new draft revision',
      durationMinutes: 45,
    });

    const saved = await saveDraftSyllabusRevision(
      {
        schoolId: SEED.schools.cloudbase,
        sourceVersionId: published.syllabusVersionId,
        lessons: editedLessons,
      },
      ctx.schoolManager,
    );

    const savedDetails = await getSyllabusVersionDetails(
      {
        schoolId: SEED.schools.cloudbase,
        syllabusVersionId: saved.syllabusVersionId,
      },
      ctx.schoolManager,
    );

    expect(saved.version).toBeGreaterThan(published.version);
    expect(savedDetails?.status).toBe('DRAFT');
    expect(savedDetails?.lessons).toHaveLength(editedLessons.length);
    expect(savedDetails?.lessons.at(-1)?.name).toBe('Added in regression test');
  });

  it('[STD-SYL-013] rejects publishing a draft syllabus version without lessons', async () => {
    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const syllabus = await prisma.syllabus.create({
      data: {
        name: `No Lessons Draft ${suffix}`,
        schoolId: SEED.schools.cloudbase,
      },
      select: { id: true },
    });

    const draftVersion = await prisma.syllabusVersion.create({
      data: {
        syllabusId: syllabus.id,
        version: 1,
        status: 'DRAFT',
      },
      select: { id: true },
    });

    await expect(
      publishDraftSyllabusVersion(
        {
          schoolId: SEED.schools.cloudbase,
          sourceVersionId: draftVersion.id,
        },
        ctx.schoolManager,
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
