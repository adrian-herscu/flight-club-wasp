import { beforeEach, describe, expect, it } from 'vitest';

import {
  createDraftSyllabusFromTemplate,
  createCourseFromFinalSyllabus,
  getManagerCoursesForEnrollment,
} from '../../src/areas/school-manager/operations.js';
import { updateMyManagedSchool } from '../../src/areas/school-manager/updateSchoolOperations.js';
import { prisma } from './wasp-server-stub.js';
import { ctx, SEED } from './testHelpers.js';

const FINAL_SYSTEM_SYLLABUS_VERSION_ID = 'seed-syllabus-version-tandem-flights-v1';
const SECONDARY_MANAGER_SCHOOL_ID = 'seed-school-cloudbase-annex';

describe('4.8 course hourly-rate baseline (API)', () => {
  beforeEach(async () => {
    const secondarySchool = await prisma.school.findUnique({
      where: { id: SECONDARY_MANAGER_SCHOOL_ID },
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        logoUrl: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        stateProvince: true,
        postalCode: true,
      },
    });

    if (!secondarySchool) {
      throw new Error('Secondary test school not found.');
    }

    await updateMyManagedSchool(
      {
        schoolId: secondarySchool.id,
        name: secondarySchool.name,
        websiteUrl: secondarySchool.websiteUrl ?? '',
        logoUrl: secondarySchool.logoUrl ?? '',
        addressLine1: secondarySchool.addressLine1,
        addressLine2: secondarySchool.addressLine2 ?? '',
        city: secondarySchool.city,
        stateProvince: secondarySchool.stateProvince ?? '',
        postalCode: secondarySchool.postalCode,
        defaultHourlyRate: null,
      },
      ctx.schoolManager,
    );
  });

  it('[STD-CRS-003] updates only the selected managed school when schoolId is provided', async () => {
    const secondarySchool = await prisma.school.findUnique({
      where: { id: SECONDARY_MANAGER_SCHOOL_ID },
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        logoUrl: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        stateProvince: true,
        postalCode: true,
      },
    });

    if (!secondarySchool) {
      throw new Error('Secondary test school not found.');
    }

    await updateMyManagedSchool(
      {
        schoolId: secondarySchool.id,
        name: secondarySchool.name,
        websiteUrl: secondarySchool.websiteUrl ?? '',
        logoUrl: secondarySchool.logoUrl ?? '',
        addressLine1: secondarySchool.addressLine1,
        addressLine2: secondarySchool.addressLine2 ?? '',
        city: secondarySchool.city,
        stateProvince: secondarySchool.stateProvince ?? '',
        postalCode: secondarySchool.postalCode,
        defaultHourlyRate: 333,
      },
      ctx.schoolManager,
    );

    const primary = await prisma.school.findUnique({
      where: { id: SEED.schools.cloudbase },
      select: { defaultHourlyRate: true },
    });
    const secondary = await prisma.school.findUnique({
      where: { id: SECONDARY_MANAGER_SCHOOL_ID },
      select: { defaultHourlyRate: true },
    });

    expect(primary?.defaultHourlyRate).not.toBe(333);
    expect(secondary?.defaultHourlyRate).toBe(333);
  });

  it('[STD-CRS-001][STD-CRS-003] uses school default hourly rate when course hourly rate is omitted', async () => {
    const school = await prisma.school.findUnique({
      where: { id: SECONDARY_MANAGER_SCHOOL_ID },
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        logoUrl: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        stateProvince: true,
        postalCode: true,
      },
    });

    if (!school) {
      throw new Error('Seed school not found.');
    }

    await updateMyManagedSchool(
      {
        schoolId: school.id,
        name: school.name,
        websiteUrl: school.websiteUrl ?? '',
        logoUrl: school.logoUrl ?? '',
        addressLine1: school.addressLine1,
        addressLine2: school.addressLine2 ?? '',
        city: school.city,
        stateProvince: school.stateProvince ?? '',
        postalCode: school.postalCode,
        defaultHourlyRate: 120,
      },
      ctx.schoolManager,
    );

    const created = await createCourseFromFinalSyllabus(
      {
        schoolId: SECONDARY_MANAGER_SCHOOL_ID,
        syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        startDate: new Date('2026-04-01T00:00:00.000Z').toISOString(),
        minCapacity: 5,
        maxCapacity: 12,
      },
      ctx.schoolManager,
    );

    const course = await prisma.course.findUnique({
      where: { id: created.courseId },
      select: { id: true, hourlyRate: true },
    });

    expect(course).not.toBeNull();
    expect(course?.hourlyRate).toBe(120);
  });

  it('[STD-CRS-002] persists start date and capacity settings on the created course', async () => {
    const startDate = '2026-04-11T00:00:00.000Z';
    const created = await createCourseFromFinalSyllabus(
      {
        schoolId: SECONDARY_MANAGER_SCHOOL_ID,
        syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        startDate,
        minCapacity: 4,
        maxCapacity: 9,
        hourlyRate: 135,
      },
      ctx.schoolManager,
    );

    const course = await prisma.course.findUnique({
      where: { id: created.courseId },
      select: {
        id: true,
        startDate: true,
        minCapacity: true,
        maxCapacity: true,
        hourlyRate: true,
      },
    });

    expect(course).not.toBeNull();
    expect(course?.startDate?.toISOString()).toBe(startDate);
    expect(course?.minCapacity).toBe(4);
    expect(course?.maxCapacity).toBe(9);
    expect(course?.hourlyRate).toBe(135);
  });

  it('[STD-CRS-003] rejects creation when neither school default nor course hourly rate is provided', async () => {
    await expect(
      createCourseFromFinalSyllabus(
        {
          syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
          startDate: new Date('2026-04-02T00:00:00.000Z').toISOString(),
          minCapacity: 5,
          maxCapacity: 12,
          schoolId: SECONDARY_MANAGER_SCHOOL_ID,
        },
        ctx.schoolManager,
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
      ctx.schoolManager,
    );

    const courses = await getManagerCoursesForEnrollment({}, ctx.schoolManager);

    expect(courses.some((course) => course.courseId === created.courseId)).toBe(true);
  });

  it('[STD-CRS-004] rejects course creation when syllabus version is not FINAL', async () => {
    const draft = await createDraftSyllabusFromTemplate(
      {
        templateVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        name: `Draft for non-final rejection ${Date.now()}`,
      },
      ctx.schoolManager,
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
        ctx.schoolManager,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'FINAL syllabus version not found in your manager scope.',
    });
  });
});
