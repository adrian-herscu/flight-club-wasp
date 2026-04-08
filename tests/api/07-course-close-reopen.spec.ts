import { beforeAll, describe, expect, it } from 'vitest';

import {
  assignInstructorToCourse,
  closeCourse,
  createCourseFromFinalSyllabus,
  enrollStudentInCourse,
  getManagerClosedCourses,
  getManagerCourseEnrollmentDetails,
  getManagerCourseInstructorDetails,
  getManagerCoursesForEnrollment,
  getManagerInstructorsForAssignment,
  getManagerStudentsForEnrollment,
  reopenCourse,
} from '../../src/school-manager/operations.js';
import { prisma } from './wasp-server-stub.js';
import {
  createIsolatedSchoolManager,
  createTestStudent,
  createTestInstructor,
  type IsolatedSchoolManager,
  type TestStudent,
  type TestInstructor,
} from './testHelpers.js';

const FINAL_SYSTEM_SYLLABUS_VERSION_ID = 'seed-syllabus-version-tandem-flights-v1';

// ---------------------------------------------------------------------------
// Isolated test state — manager with seeded student/instructor + outsider data
// ---------------------------------------------------------------------------

let mgr: IsolatedSchoolManager;
let student: TestStudent;
let instructor: TestInstructor;
let outsideMgr: IsolatedSchoolManager;
let outsideStudent: TestStudent;
let outsideInstructor: TestInstructor;

beforeAll(async () => {
  mgr = await createIsolatedSchoolManager();

  // Set a default hourly rate so course creation works without specifying it per-call
  await prisma.school.update({
    where: { id: mgr.school.id },
    data: { defaultHourlyRate: 150 },
  });

  student = await createTestStudent(mgr.school.id, mgr.school.currency);
  instructor = await createTestInstructor(mgr.school.id, mgr.school.currency);

  // Outsider school — students/instructors here are outside the manager's scope
  outsideMgr = await createIsolatedSchoolManager();
  outsideStudent = await createTestStudent(outsideMgr.school.id, outsideMgr.school.currency);
  outsideInstructor = await createTestInstructor(outsideMgr.school.id, outsideMgr.school.currency);
});

describe('4.8 course close/reopen lifecycle (API)', () => {
  it('[STD-CRS-006] manager can close and reopen a course', async () => {
    const created = await createCourseFromFinalSyllabus(
      {
        syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        startDate: new Date('2026-06-01T00:00:00.000Z').toISOString(),
      },
      mgr.user.ctx,
    );

    await closeCourse({ courseId: created.courseId }, mgr.user.ctx);

    const openCoursesAfterClose = await getManagerCoursesForEnrollment({}, mgr.user.ctx);
    const closedCoursesAfterClose = await getManagerClosedCourses({}, mgr.user.ctx);

    expect(openCoursesAfterClose.some((course) => course.courseId === created.courseId)).toBe(false);
    expect(closedCoursesAfterClose.some((course) => course.courseId === created.courseId)).toBe(true);

    await reopenCourse({ courseId: created.courseId }, mgr.user.ctx);

    const openCoursesAfterReopen = await getManagerCoursesForEnrollment({}, mgr.user.ctx);
    const closedCoursesAfterReopen = await getManagerClosedCourses({}, mgr.user.ctx);

    expect(openCoursesAfterReopen.some((course) => course.courseId === created.courseId)).toBe(true);
    expect(closedCoursesAfterReopen.some((course) => course.courseId === created.courseId)).toBe(false);
  });

  it('[STD-CRS-007] enrollment and assignment are blocked for closed courses', async () => {
    const created = await createCourseFromFinalSyllabus(
      {
        syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        startDate: new Date('2026-06-02T00:00:00.000Z').toISOString(),
      },
      mgr.user.ctx,
    );

    await closeCourse({ courseId: created.courseId }, mgr.user.ctx);

    await expect(
      enrollStudentInCourse(
        {
          courseId: created.courseId,
          studentId: student.studentId,
        },
        mgr.user.ctx,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Course is closed and cannot accept new enrollments.',
    });

    await expect(
      assignInstructorToCourse(
        {
          courseId: created.courseId,
          instructorId: instructor.instructorId,
        },
        mgr.user.ctx,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Course is closed and cannot accept new instructor assignments.',
    });
  });

  it('[STD-ENR-002][STD-ENR-003][STD-ENR-004] manager can enroll student, see roster updates, and duplicates are blocked', async () => {
    const created = await createCourseFromFinalSyllabus(
      {
        syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        startDate: new Date('2026-06-03T00:00:00.000Z').toISOString(),
      },
      mgr.user.ctx,
    );

    await enrollStudentInCourse(
      {
        schoolId: mgr.school.id,
        courseId: created.courseId,
        studentId: student.studentId,
      },
      mgr.user.ctx,
    );

    const details = await getManagerCourseEnrollmentDetails(
      {
        schoolId: mgr.school.id,
        courseId: created.courseId,
      },
      mgr.user.ctx,
    );

    expect(details).not.toBeNull();
    expect(details?.courseId).toBe(created.courseId);
    expect(details?.enrolledCount).toBeGreaterThanOrEqual(1);
    expect(details?.enrolledStudents.some((s) => s.studentId === student.studentId)).toBe(true);

    await expect(
      enrollStudentInCourse(
        {
          schoolId: mgr.school.id,
          courseId: created.courseId,
          studentId: student.studentId,
        },
        mgr.user.ctx,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Student is already enrolled in this course.',
    });
  });

  it('[STD-ASN-002][STD-ASN-003] manager can assign instructor and duplicate assignment is blocked', async () => {
    const created = await createCourseFromFinalSyllabus(
      {
        syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        startDate: new Date('2026-06-04T00:00:00.000Z').toISOString(),
      },
      mgr.user.ctx,
    );

    await assignInstructorToCourse(
      {
        schoolId: mgr.school.id,
        courseId: created.courseId,
        instructorId: instructor.instructorId,
      },
      mgr.user.ctx,
    );

    const details = await getManagerCourseInstructorDetails(
      {
        schoolId: mgr.school.id,
        courseId: created.courseId,
      },
      mgr.user.ctx,
    );

    expect(details).not.toBeNull();
    expect(details?.courseId).toBe(created.courseId);
    expect(details?.assignedCount).toBeGreaterThanOrEqual(1);
    expect(details?.assignedInstructors.some((i) => i.instructorId === instructor.instructorId)).toBe(true);

    await expect(
      assignInstructorToCourse(
        {
          schoolId: mgr.school.id,
          courseId: created.courseId,
          instructorId: instructor.instructorId,
        },
        mgr.user.ctx,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Instructor is already assigned to this course.',
    });
  });

  it('[STD-ENR-005][STD-ASN-006] manager cannot enroll or assign users from outside authorized school scope', async () => {
    const created = await createCourseFromFinalSyllabus(
      {
        syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        startDate: new Date('2026-06-05T00:00:00.000Z').toISOString(),
      },
      mgr.user.ctx,
    );

    await expect(
      enrollStudentInCourse(
        {
          schoolId: mgr.school.id,
          courseId: created.courseId,
          studentId: outsideStudent.studentId,
        },
        mgr.user.ctx,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Student not found in your school scope.',
    });

    await expect(
      assignInstructorToCourse(
        {
          schoolId: mgr.school.id,
          courseId: created.courseId,
          instructorId: outsideInstructor.instructorId,
        },
        mgr.user.ctx,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Instructor not found in your school scope.',
    });
  });

  it('[STD-ENR-001] getManagerStudentsForEnrollment returns students in school scope', async () => {
    const students = await getManagerStudentsForEnrollment(
      { schoolId: mgr.school.id },
      mgr.user.ctx,
    );
    expect(students.some((s) => s.studentId === student.studentId)).toBe(true);
    expect(students.some((s) => s.studentId === outsideStudent.studentId)).toBe(false);
  });

  it('[STD-ASN-001] getManagerInstructorsForAssignment returns instructors in school scope', async () => {
    const instructors = await getManagerInstructorsForAssignment(
      { schoolId: mgr.school.id },
      mgr.user.ctx,
    );
    expect(instructors.some((i) => i.instructorId === instructor.instructorId)).toBe(true);
    expect(instructors.some((i) => i.instructorId === outsideInstructor.instructorId)).toBe(false);
  });
});
