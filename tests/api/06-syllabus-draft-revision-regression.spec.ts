import { beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

import {
  createDraftSyllabusFromTemplate,
  getSyllabusVersionDetails,
  publishDraftSyllabusVersion,
  saveDraftSyllabusRevision,
} from '../../src/school-manager/operations.js';
import { createIsolatedSchoolManager, type IsolatedSchoolManager } from './testHelpers.js';
import { prisma } from './wasp-server-stub.js';

const FINAL_SYSTEM_SYLLABUS_VERSION_ID = 'seed-syllabus-version-tandem-flights-v1';

// ---------------------------------------------------------------------------
// Isolated test state — each file owns its school
// ---------------------------------------------------------------------------

let mgr: IsolatedSchoolManager;

beforeAll(async () => {
  mgr = await createIsolatedSchoolManager();
});

describe('4.10 syllabus draft revision regression (API)', () => {
  it('[STD-SYL-010] allows saving a new DRAFT revision after editing a manager-owned FINAL version', async () => {
    const uniqueName = `Regression syllabus ${Date.now()}`;

    const createdDraft = await createDraftSyllabusFromTemplate(
      {
        schoolId: mgr.school.id,
        templateVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        name: uniqueName,
      },
      mgr.user.ctx,
    );

    const published = await publishDraftSyllabusVersion(
      {
        schoolId: mgr.school.id,
        sourceVersionId: createdDraft.syllabusVersionId,
      },
      mgr.user.ctx,
    );

    const finalDetails = await getSyllabusVersionDetails(
      {
        schoolId: mgr.school.id,
        syllabusVersionId: published.syllabusVersionId,
      },
      mgr.user.ctx,
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
        schoolId: mgr.school.id,
        sourceVersionId: published.syllabusVersionId,
        lessons: editedLessons,
      },
      mgr.user.ctx,
    );

    const savedDetails = await getSyllabusVersionDetails(
      {
        schoolId: mgr.school.id,
        syllabusVersionId: saved.syllabusVersionId,
      },
      mgr.user.ctx,
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
        schoolId: mgr.school.id,
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
          schoolId: mgr.school.id,
          sourceVersionId: draftVersion.id,
        },
        mgr.user.ctx,
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
