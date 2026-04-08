import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import Breadcrumb from "../../admin/layout/Breadcrumb";
import DefaultLayout from "../../admin/layout/DefaultLayout";
import {
  StudentCourseListItem,
  StudentCoursesEmptyText,
  StudentCoursesList,
  StudentCoursesLoadingText,
  StudentCoursesPageRoot,
} from "../../client/components/patterns/StudentCoursesPagePatterns";
import { useStudentSchoolSelection } from "./useStudentSchoolSelection";

const { getStudentSchools, getStudentEnrolledCourses, useQuery } = operations as any;

const StudentCoursesPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();

  const { data: schoolsData, isLoading: schoolsLoading } = useQuery(getStudentSchools);
  const schools = (schoolsData ?? []) as { id: string; name: string }[];
  const { selectedSchoolId } = useStudentSchoolSelection(schools);

  const { data: coursesData, isLoading: coursesLoading } = useQuery(
    getStudentEnrolledCourses,
    selectedSchoolId ? { schoolId: selectedSchoolId } : undefined,
    { enabled: !schoolsLoading },
  );

  const courses = (coursesData ?? []) as {
    courseId: string;
    syllabusName: string;
    syllabusVersion: number;
    startDate: Date | string | null;
    schoolName: string;
  }[];

  const isLoading = schoolsLoading || coursesLoading;

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName={t("admin.courses")} />
      <StudentCoursesPageRoot testId="student-courses-page">
        {isLoading ? (
          <StudentCoursesLoadingText>{t("admin.loading")}</StudentCoursesLoadingText>
        ) : courses.length === 0 ? (
          <StudentCoursesEmptyText>{t("student.noEnrolledCourses")}</StudentCoursesEmptyText>
        ) : (
          <StudentCoursesList>
            {courses.map((course) => {
              const startLabel = course.startDate
                ? new Date(course.startDate).toLocaleDateString()
                : "—";

              return (
                <StudentCourseListItem
                  key={course.courseId}
                  title={`${course.syllabusName} v${course.syllabusVersion}`}
                  subtitle={`${course.schoolName} · ${startLabel}`}
                />
              );
            })}
          </StudentCoursesList>
        )}
      </StudentCoursesPageRoot>
    </DefaultLayout>
  );
};

export default StudentCoursesPage;