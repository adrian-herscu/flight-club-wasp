import {
  CourseLifecycleStatus,
  SyllabusVersionStatus,
} from "@prisma/client";
import { prisma } from "wasp/server";

export type LandingCourse = {
  id: string;
  title: string;
  startDate: Date | null;
  minCapacity: number | null;
  maxCapacity: number | null;
  hourlyRate: number | null;
};

export type LandingSchoolWithCourses = {
  id: string;
  name: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  city: string;
  country: string;
  courses: LandingCourse[];
};

export const getLandingSchoolsWithCourses = async (
  _args: unknown,
  _context: unknown,
): Promise<LandingSchoolWithCourses[]> => {
  const [schools, finalCourses, publishedSyllabusVersions] = await Promise.all([
    prisma.school.findMany({
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        logoUrl: true,
        city: true,
        country: true,
      },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    }),
    prisma.course.findMany({
      where: {
        syllabusVersion: {
          status: SyllabusVersionStatus.FINAL,
        },
      },
      select: {
        id: true,
        startDate: true,
        minCapacity: true,
        maxCapacity: true,
        hourlyRate: true,
        schoolId: true,
        syllabusVersion: {
          select: {
            id: true,
            version: true,
            syllabus: {
              select: {
                schoolId: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.syllabusVersion.findMany({
      where: {
        status: SyllabusVersionStatus.FINAL,
      },
      select: {
        id: true,
        version: true,
        syllabus: {
          select: {
            schoolId: true,
            name: true,
          },
        },
      },
      orderBy: [{ syllabus: { name: "asc" } }, { version: "desc" }],
    }),
  ]);

  const lifecycleEvents = await prisma.courseLifecycleEvent.findMany({
    where: {
      courseId: {
        in: finalCourses.map((course) => course.id),
      },
    },
    select: {
      courseId: true,
      status: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const latestStatusByCourseId = new Map<string, CourseLifecycleStatus>();
  for (const event of lifecycleEvents) {
    if (!latestStatusByCourseId.has(event.courseId)) {
      latestStatusByCourseId.set(event.courseId, event.status);
    }
  }

  const openFinalCourses = finalCourses.filter(
    (course) => latestStatusByCourseId.get(course.id) !== CourseLifecycleStatus.CLOSED,
  );

  const syllabusVersionIdsWithOpenCourseRows = new Set(
    openFinalCourses.map((course) => course.syllabusVersion.id),
  );

  return schools
    .map((school) => {
      const openRealCourses = openFinalCourses
        .filter(
          (course) =>
            course.schoolId === school.id ||
            (course.schoolId === null &&
              (course.syllabusVersion.syllabus.schoolId === null ||
                course.syllabusVersion.syllabus.schoolId === school.id)),
        )
        .map((course) => ({
          id: course.id,
          title: `${course.syllabusVersion.syllabus.name} v${course.syllabusVersion.version}`,
          startDate: course.startDate,
          minCapacity: course.minCapacity,
          maxCapacity: course.maxCapacity,
          hourlyRate: course.hourlyRate,
        }));

      const fallbackFinalSyllabusCourses = publishedSyllabusVersions
        .filter(
          (syllabusVersion) =>
            !syllabusVersionIdsWithOpenCourseRows.has(syllabusVersion.id) &&
            (syllabusVersion.syllabus.schoolId === null ||
              syllabusVersion.syllabus.schoolId === school.id),
        )
        .map((syllabusVersion) => ({
          id: syllabusVersion.id,
          title: `${syllabusVersion.syllabus.name} v${syllabusVersion.version}`,
          startDate: null,
          minCapacity: null,
          maxCapacity: null,
          hourlyRate: null,
        }));

      const courses = [...openRealCourses, ...fallbackFinalSyllabusCourses];

      return {
        id: school.id,
        name: school.name,
        websiteUrl: school.websiteUrl,
        logoUrl: school.logoUrl,
        city: school.city,
        country: school.country,
        courses,
      };
    })
    .filter((school) => school.courses.length > 0);
};
