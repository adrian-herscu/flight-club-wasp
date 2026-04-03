import { type CourseInterestStatus } from "@prisma/client";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import { useTranslation } from "react-i18next";
import DefaultLayout from "../../admin/layout/DefaultLayout";
import {
  StudentDashboardInterestItem,
  StudentDashboardInterestList,
  StudentDashboardInterestSchool,
  StudentDashboardInterestStatusLabel,
  StudentDashboardInterestStatusLine,
  StudentDashboardInterestStatusValue,
  StudentDashboardInterestTitle,
  StudentDashboardMutedText,
  StudentDashboardRoot,
  StudentDashboardTitle,
} from "../../client/components/patterns/StudentDashboardPatterns";

const { getMyInterests, useQuery } = operations as any;

type InterestItem = {
  id: string;
  status: CourseInterestStatus;
  createdAt: string;
  course: {
    id: string;
    title: string;
    startDate: string | null;
    schoolName: string | null;
  };
};

function interestStatusLabel(status: CourseInterestStatus, t: (key: string) => string): string {
  if (status === "ENROLLED") {
    return t("student.statusEnrolled");
  }

  if (status === "CANCELLED") {
    return t("student.statusCancelled");
  }

  return t("student.statusInterested");
}

const StudentDashboardPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery(getMyInterests);
  const interests = (data as InterestItem[] | undefined) ?? [];

  return (
    <DefaultLayout user={user}>
      <StudentDashboardRoot testId="student-dashboard-placeholder">
        <StudentDashboardTitle>{t("student.myInterestsTitle")}</StudentDashboardTitle>

        {isLoading && <StudentDashboardMutedText>{t("common.loading")}</StudentDashboardMutedText>}

        {!isLoading && interests.length === 0 && (
          <StudentDashboardMutedText testId="no-interests-placeholder">
            {t("student.noInterestsYet")}
          </StudentDashboardMutedText>
        )}

        {!isLoading && interests.length > 0 && (
          <StudentDashboardInterestList testId="my-interests-list">
            {interests.map((interest) => (
              <StudentDashboardInterestItem key={interest.id} testId="interest-item">
                <StudentDashboardInterestTitle>{interest.course.title}</StudentDashboardInterestTitle>
                {interest.course.schoolName && (
                  <StudentDashboardInterestSchool>{interest.course.schoolName}</StudentDashboardInterestSchool>
                )}
                <StudentDashboardInterestStatusLine>
                  <StudentDashboardInterestStatusLabel>
                    {t("student.statusLabel")}: 
                  </StudentDashboardInterestStatusLabel>
                  <StudentDashboardInterestStatusValue testId="interest-status">
                    {interestStatusLabel(interest.status, t)}
                  </StudentDashboardInterestStatusValue>
                </StudentDashboardInterestStatusLine>
              </StudentDashboardInterestItem>
            ))}
          </StudentDashboardInterestList>
        )}
      </StudentDashboardRoot>
    </DefaultLayout>
  );
};

export default StudentDashboardPage;
