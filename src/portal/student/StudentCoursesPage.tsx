import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import Breadcrumb from "../../admin/layout/Breadcrumb";
import DefaultLayout from "../../admin/layout/DefaultLayout";
import { ListItem } from "../../client/components/patterns/ListItem";
import {
  EmptyText,
  LoadingText,
  PageRoot,
  SimpleList,
} from "../../client/components/patterns/PagePrimitives";
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
      <PageRoot testId="student-courses-page">
        {isLoading ? (
          <LoadingText>{t("admin.loading")}</LoadingText>
        ) : courses.length === 0 ? (
          <EmptyText>{t("student.noEnrolledCourses")}</EmptyText>
        ) : (
          <SimpleList>
            {courses.map((course) => {
              const startLabel = course.startDate
                ? new Date(course.startDate).toLocaleDateString()
                : "—";

              return (
                <ListItem
                  key={course.courseId}
                  href={`/student/courses/${course.courseId}`}
                  title={`${course.syllabusName} v${course.syllabusVersion}`}
                  subtitle={`${course.schoolName} · ${startLabel}`}
                />
              );
            })}
          </SimpleList>
        )}
      </PageRoot>
    </DefaultLayout>
  );
};

export default StudentCoursesPage;