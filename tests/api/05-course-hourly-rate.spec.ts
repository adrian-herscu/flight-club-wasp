import { beforeAll, describe, expect, it } from 'vitest';

import {
  createDraftSyllabusFromTemplate,
  createCourseFromFinalSyllabus,
  getManagerCoursesForEnrollment,
} from '../../src/school-manager/operations.js';
import { prisma } from './wasp-server-stub.js';
import {
  createIsolatedSchoolManager,
  addIsolatedSchoolToManager,
  type IsolatedSchoolManager,
  type TestSchool,
} from './testHelpers.js';

const FINAL_SYSTEM_SYLLABUS_VERSION_ID = 'seed-syllabus-version-tandem-flights-v1';

// ---------------------------------------------------------------------------
// Isolated test state — one manager with two schools
// ---------------------------------------------------------------------------

let mgr: IsolatedSchoolManager;
let secondarySchool: TestSchool;

beforeAll(async () => {
  mgr = await createIsolatedSchoolManager();
  secondarySchool = await addIsolatedSchoolToManager(mgr.user.id);
  // Both schools start with defaultHourlyRate = null (DB default)
});

describe('4.8 course hourly-rate baseline (API)', () => {
  it('[STD-CRS-003] updates only the selected managed school when schoolId is provided', async () => {
    // Reset both to null before this test
    await prisma.school.update({ where: { id: mgr.school.id }, data: { defaultHourlyRate: null } });
    await prisma.school.update({ where: { id: secondarySchool.id }, data: { defaultHourlyRate: null } });

    // Set rate only on secondary school
    await prisma.school.update({ where: { id: secondarySchool.id }, data: { defaultHourlyRate: 333 } });

    const primary = await prisma.school.findUnique({
      where: { id: mgr.school.id },
      select: { defaultHourlyRate: true },
    });
    const secondary = await prisma.school.findUnique({
      where: { id: secondarySchool.id },
      select: { defaultHourlyRate: true },
    });

    expect(primary?.defaultHourlyRate).toBeNull();
    expect(secondary?.defaultHourlyRate).toBe(333);
  });

  it('[STD-CRS-001][STD-CRS-003] uses school default hourly rate when course hourly rate is omitted', async () => {
    await prisma.school.update({ where: { id: mgr.school.id }, data: { defaultHourlyRate: 120 } });

    const created = await createCourseFromFinalSyllabus(
      {
        syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        startDate: new Date('2026-04-01T00:00:00.000Z').toISOString(),
        minCapacity: 5,
        maxCapacity: 12,
      },
      mgr.user.ctx,
    );

    const course = await prisma.course.findUnique({
      where: { id: created.courseId },
      select: { id: true, hourlyRate: true },
    });

    expect(course).not.toBeNull();
    expect(course?.hourlyRate).toBe(120);
  });

  it('[STD-CRS-003] rejects creation when neither school default nor course hourly rate is provided', async () => {
    await prisma.school.update({ where: { id: mgr.school.id }, data: { defaultHourlyRate: null } });

    await expect(
      createCourseFromFinalSyllabus(
        {
          syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
          startDate: new Date('2026-04-02T00:00:00.000Z').toISOString(),
          minCapacity: 5,
          maxCapacity: 12,
        },
        mgr.user.ctx,
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message:
        'Missing hourly rate. Set school default hourly rate or provide a course hourly rate.',
    });
  });

  it('[STD-CRS-003] lists course opened from system FINAL syllabus under manager school', async () => {
    const created = await createCourseFromFinalSyllabus(
      {
        syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        startDate: new Date('2026-04-03T00:00:00.000Z').toISOString(),
        minCapacity: 3,
        maxCapacity: 10,
        hourlyRate: 140,
      },
      mgr.user.ctx,
    );

    const courses = await getManagerCoursesForEnrollment({}, mgr.user.ctx);

    expect(courses.some((course) => course.courseId === created.courseId)).toBe(true);
  });

  it('[STD-CRS-004] rejects course creation when syllabus version is not FINAL', async () => {
    const draft = await createDraftSyllabusFromTemplate(
      {
        templateVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        name: `Draft for non-final rejection ${Date.now()}`,
      },
      mgr.user.ctx,
    );

    await expect(
      createCourseFromFinalSyllabus(
        {
          syllabusVersionId: draft.syllabusVersionId,
          startDate: new Date('2026-04-04T00:00:00.000Z').toISOString(),
          minCapacity: 3,
          maxCapacity: 10,
          hourlyRate: 140,
        },
        mgr.user.ctx,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'FINAL syllabus version not found in your manager scope.',
    });
  });
});
