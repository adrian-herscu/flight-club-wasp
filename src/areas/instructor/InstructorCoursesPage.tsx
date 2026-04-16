import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import Breadcrumb from "../system-admin/layout/Breadcrumb";
import DefaultLayout from "../system-admin/layout/DefaultLayout";
import { ListItem } from "../../client/components/patterns/ListItem";
import {
  EmptyText,
  LoadingText,
  PageRoot,
  SimpleList,
} from "../../client/components/patterns/PagePrimitives";
import { useInstructorSchoolSelection } from "../../features/school-context/useInstructorSchoolSelection";

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
      <PageRoot testId="instructor-courses-page">
        {isLoading ? (
          <LoadingText>{t("admin.loading")}</LoadingText>
        ) : courses.length === 0 ? (
          <EmptyText>
            {t("instructor.noAssignedCourses")}
          </EmptyText>
        ) : (
          <SimpleList>
            {courses.map((course) => {
              const startLabel = course.startDate
                ? new Date(course.startDate).toLocaleDateString()
                : "—";
              return (
                <ListItem
                  key={course.courseId}
                  href={`/instructor/courses/${course.courseId}`}
                  title={`${course.syllabusName} v${course.syllabusVersion}`}
                  subtitle={`${course.schoolName} · ${startLabel}`}
                  status={course.lifecycleStatus === "CLOSED" ? "Closed" : "Open"}
                />
              );
            })}
          </SimpleList>
        )}
      </PageRoot>
    </DefaultLayout>
  );
};

export default InstructorCoursesPage;
