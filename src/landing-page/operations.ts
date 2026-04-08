import {
  CourseInterestStatus,
  CourseLifecycleStatus,
  SchoolRole,
  SyllabusVersionStatus,
} from "@prisma/client";
import { prisma } from "wasp/server";

type LandingContact = {
  userId: string;
  displayName: string;
  email: string;
  phone: string | null;
};

export type LandingCourse = {
  id: string;
  title: string;
  startDate: Date | null;
  minCapacity: number | null;
  maxCapacity: number | null;
  hourlyRate: number | null;
  instructorContacts: LandingContact[];
  canExpressInterest: boolean;
  viewerInterestId: string | null;
  viewerInterestStatus: CourseInterestStatus | null;
};

export type LandingSchoolWithCourses = {
  id: string;
  name: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  city: string;
  country: string;
  managerContacts: LandingContact[];
  courses: LandingCourse[];
};

export const getLandingSchoolsWithCourses = async (
  _args: unknown,
  context: { user?: { id: string } | null },
): Promise<LandingSchoolWithCourses[]> => {
  const isAuthenticated = Boolean(context.user?.id);

  const [schools, finalCourses] = await Promise.all([
    prisma.school.findMany({
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        logoUrl: true,
        city: true,
        country: true,
        admin: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        schoolRoles: {
          where: {
            role: SchoolRole.SCHOOL_MANAGER,
            revokedAt: null,
          },
          select: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
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
        assignedInstructors: {
          select: {
            instructor: {
              select: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
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

  const viewerInterestByCourseId = new Map<
    string,
    { id: string; status: CourseInterestStatus }
  >();
  if (context.user?.id && openFinalCourses.length > 0) {
    const viewerInterests = await prisma.courseInterest.findMany({
      where: {
        userId: context.user.id,
        courseId: {
          in: openFinalCourses.map((course) => course.id),
        },
      },
      select: {
        id: true,
        courseId: true,
        status: true,
      },
    });

    for (const interest of viewerInterests) {
      viewerInterestByCourseId.set(interest.courseId, {
        id: interest.id,
        status: interest.status,
      });
    }
  }

  const schoolManagerContactsBySchoolId = new Map<string, LandingContact[]>();
  for (const school of schools) {
    const managerContactsByUserId = new Map<string, LandingContact>();
    const managerUsers = [
      school.admin,
      ...school.schoolRoles.map((schoolRole) => schoolRole.user),
    ];

    for (const user of managerUsers) {
      managerContactsByUserId.set(user.id, {
        userId: user.id,
        displayName: user.fullName ?? user.email,
        email: user.email,
        phone: user.phone,
      });
    }

    schoolManagerContactsBySchoolId.set(
      school.id,
      Array.from(managerContactsByUserId.values()).sort((a, b) =>
        a.displayName.localeCompare(b.displayName),
      ),
    );
  }

  const instructorContactsByCourseId = new Map<string, LandingContact[]>();
  for (const course of openFinalCourses) {
    const instructorContactsByUserId = new Map<string, LandingContact>();
    for (const assignment of course.assignedInstructors) {
      const user = assignment.instructor.user;
      instructorContactsByUserId.set(user.id, {
        userId: user.id,
        displayName: user.fullName ?? user.email,
        email: user.email,
        phone: user.phone,
      });
    }

    instructorContactsByCourseId.set(
      course.id,
      Array.from(instructorContactsByUserId.values()).sort((a, b) =>
        a.displayName.localeCompare(b.displayName),
      ),
    );
  }

  return schools
    .map((school) => {
      const courses = openFinalCourses
        .filter((course) => course.schoolId === school.id)
        .map((course) => ({
          ...(viewerInterestByCourseId.get(course.id)
            ? {
                viewerInterestId: viewerInterestByCourseId.get(course.id)?.id ?? null,
                viewerInterestStatus:
                  viewerInterestByCourseId.get(course.id)?.status ?? null,
              }
            : {
                viewerInterestId: null,
                viewerInterestStatus: null,
              }),
          id: course.id,
          title: `${course.syllabusVersion.syllabus.name} v${course.syllabusVersion.version}`,
          startDate: course.startDate,
          minCapacity: course.minCapacity,
          maxCapacity: course.maxCapacity,
          hourlyRate: course.hourlyRate,
          instructorContacts: isAuthenticated
            ? (instructorContactsByCourseId.get(course.id) ?? [])
            : [],
          canExpressInterest: true,
        }));

      return {
        id: school.id,
        name: school.name,
        websiteUrl: school.websiteUrl,
        logoUrl: school.logoUrl,
        city: school.city,
        country: school.country,
        managerContacts: isAuthenticated
          ? (schoolManagerContactsBySchoolId.get(school.id) ?? [])
          : [],
        courses,
      };
    })
    .filter((school) => school.courses.length > 0);
};
