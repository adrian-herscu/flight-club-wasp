import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import DefaultLayout from "../system-admin/layout/DefaultLayout";
import { CenteredPlaceholder } from "../../client/components/patterns/AppStructure";
import { ListItem } from "../../client/components/patterns/ListItem";
import {
  EmptyText,
  LoadingText,
  PageRoot,
  SimpleList,
  TitledSection,
} from "../../client/components/patterns/PagePrimitives";

const { getMyInterests, useQuery } = operations as any;

type StudentInterestItem = {
  id: string;
  status: "INTERESTED" | "ENROLLED" | "CANCELLED";
  course: {
    id: string;
    title: string;
    startDate: Date | string | null;
    schoolName: string | null;
  };
};

function formatInterestStatus(status: StudentInterestItem["status"], t: (key: string) => string): string {
  if (status === "INTERESTED") return t("student.statusInterested");
  if (status === "ENROLLED") return t("student.statusEnrolled");
  return t("student.statusCancelled");
}

const StudentDashboardPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();
  const { data: interestsData, isLoading } = useQuery(getMyInterests);
  const interests = (interestsData as StudentInterestItem[] | undefined) ?? [];

  return (
    <DefaultLayout user={user}>
      <PageRoot testId="student-dashboard-page">
        <CenteredPlaceholder testId="student-dashboard-placeholder">Under construction</CenteredPlaceholder>

        <TitledSection
          testId="student-dashboard-interests-section"
          title={t("student.myInterestsTitle")}
        >
          {isLoading ? (
            <LoadingText>{t("common.loading")}</LoadingText>
          ) : interests.length === 0 ? (
            <EmptyText>{t("student.noInterestsYet")}</EmptyText>
          ) : (
            <SimpleList>
              {interests.map((interest) => {
                const startLabel = interest.course.startDate
                  ? new Date(interest.course.startDate).toLocaleDateString()
                  : t("landing.dateToBeAnnounced");

                return (
                  <ListItem
                    key={interest.id}
                    href={`/student/courses/${interest.course.id}`}
                    testId="student-interest-item"
                    title={interest.course.title}
                    subtitle={`${interest.course.schoolName ?? "-"} · ${startLabel} · ${t("student.statusLabel")}: ${formatInterestStatus(interest.status, t)}`}
                  />
                );
              })}
            </SimpleList>
          )}
        </TitledSection>
      </PageRoot>
    </DefaultLayout>
  );
};

export default StudentDashboardPage;
