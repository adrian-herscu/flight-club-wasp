import {
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
  const [schools, publishedSyllabusVersions] = await Promise.all([
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

  return schools
    .map((school) => {
      const courses = publishedSyllabusVersions
        .filter(
          ({ syllabus }) =>
            syllabus.schoolId === null || syllabus.schoolId === school.id,
        )
        .map((syllabusVersion) => ({
          id: syllabusVersion.id,
          title: `${syllabusVersion.syllabus.name} v${syllabusVersion.version}`,
          startDate: null,
          minCapacity: null,
          maxCapacity: null,
          hourlyRate: null,
        }));

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
