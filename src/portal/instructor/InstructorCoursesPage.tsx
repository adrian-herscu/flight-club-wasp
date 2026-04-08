import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import Breadcrumb from "../../admin/layout/Breadcrumb";
import DefaultLayout from "../../admin/layout/DefaultLayout";
import {
  InstructorCourseListItem,
  InstructorCoursesEmptyText,
  InstructorCoursesList,
  InstructorCoursesLoadingText,
  InstructorCoursesPageRoot,
} from "../../client/components/patterns/InstructorCoursesPagePatterns";
import { useInstructorSchoolSelection } from "./useInstructorSchoolSelection";

const { getInstructorSchools, getInstructorAssignedCourses, useQuery } = operations as any;

const InstructorCoursesPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();

  const { data: schoolsData, isLoading: schoolsLoading } = useQuery(getInstructorSchools);
  const schools = (schoolsData ?? []) as { id: string; name: string }[];
  const { selectedSchoolId } = useInstructorSchoolSelection(schools);

  const { data: coursesData, isLoading: coursesLoading } = useQuery(
    getInstructorAssignedCourses,
    selectedSchoolId ? { schoolId: selectedSchoolId } : undefined,
    { enabled: !schoolsLoading },
  );
  const courses = (coursesData ?? []) as {
    courseId: string;
    syllabusName: string;
    syllabusVersion: number;
    startDate: Date | string | null;
    schoolName: string;
    lifecycleStatus: "OPEN" | "CLOSED";
  }[];

  const isLoading = schoolsLoading || coursesLoading;

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName={t("admin.courses")} />
      <InstructorCoursesPageRoot testId="instructor-courses-page">
        {isLoading ? (
          <InstructorCoursesLoadingText>{t("admin.loading")}</InstructorCoursesLoadingText>
        ) : courses.length === 0 ? (
          <InstructorCoursesEmptyText>
            {t("instructor.noAssignedCourses")}
          </InstructorCoursesEmptyText>
        ) : (
          <InstructorCoursesList>
            {courses.map((course) => {
              const startLabel = course.startDate
                ? new Date(course.startDate).toLocaleDateString()
                : "—";
              return (
                <InstructorCourseListItem
                  key={course.courseId}
                  title={`${course.syllabusName} v${course.syllabusVersion}`}
                  subtitle={`${course.schoolName} · ${startLabel}`}
                  status={course.lifecycleStatus === "CLOSED" ? "Closed" : "Open"}
                />
              );
            })}
          </InstructorCoursesList>
        )}
      </InstructorCoursesPageRoot>
    </DefaultLayout>
  );
};

export default InstructorCoursesPage;
