import { beforeEach, describe, expect, it } from 'vitest';

import {
  createCourseFromFinalSyllabus,
  getManagerCoursesForEnrollment,
} from '../../app/src/school-manager/operations';
import { updateMyManagedSchool } from '../../app/src/school-manager/updateSchoolOperations';
import { prisma } from '../src/wasp-server-stub.js';
import { ctx, SEED } from '../src/testHelpers';

const FINAL_SYSTEM_SYLLABUS_VERSION_ID = 'seed-syllabus-version-tandem-flights-v1';
const SECONDARY_MANAGER_SCHOOL_ID = 'seed-school-cloudbase-annex';

describe('4.8 course hourly-rate baseline (API)', () => {
  beforeEach(async () => {
    const school = await prisma.school.findUnique({
      where: { id: SEED.schools.cloudbase },
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        phone: true,
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
        phone: school.phone ?? '',
        logoUrl: school.logoUrl ?? '',
        addressLine1: school.addressLine1,
        addressLine2: school.addressLine2 ?? '',
        city: school.city,
        stateProvince: school.stateProvince ?? '',
        postalCode: school.postalCode,
        defaultHourlyRate: null,
      },
      ctx.schoolManager,
    );

    const secondarySchool = await prisma.school.findUnique({
      where: { id: SECONDARY_MANAGER_SCHOOL_ID },
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        phone: true,
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
        phone: secondarySchool.phone ?? '',
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
        phone: true,
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
        phone: secondarySchool.phone ?? '',
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

    expect(primary?.defaultHourlyRate).toBeNull();
    expect(secondary?.defaultHourlyRate).toBe(333);
  });

  it('[STD-CRS-003] uses school default hourly rate when course hourly rate is omitted', async () => {
    const school = await prisma.school.findUnique({
      where: { id: SEED.schools.cloudbase },
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        phone: true,
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
        phone: school.phone ?? '',
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

  it('[STD-CRS-003] rejects creation when neither school default nor course hourly rate is provided', async () => {
    await expect(
      createCourseFromFinalSyllabus(
        {
          syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
          startDate: new Date('2026-04-02T00:00:00.000Z').toISOString(),
          minCapacity: 5,
          maxCapacity: 12,
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
});
