import { useTranslation } from "react-i18next";
import * as operations from "wasp/client/operations";
import { type AuthUser } from "wasp/auth";
import DefaultLayout from "../../admin/layout/DefaultLayout";
import { type CourseInterestStatus } from "@prisma/client";

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
  switch (status) {
    case "INTERESTED": return t("student.statusInterested");
    case "CONTACTED": return t("student.statusContacted");
    case "ENROLLED": return t("student.statusEnrolled");
    case "CANCELLED": return t("student.statusCancelled");
    default: return String(status);
  }
}

const StudentDashboardPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery(getMyInterests);
  const interests = (data as InterestItem[] | undefined) ?? [];

  return (
    <DefaultLayout user={user}>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">{t("student.myInterestsTitle")}</h1>

        {isLoading && (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        )}

        {!isLoading && interests.length === 0 && (
          <p className="text-sm text-muted-foreground" data-testid="no-interests-placeholder">
            {t("student.noInterestsYet")}
          </p>
        )}

        {!isLoading && interests.length > 0 && (
          <ul className="space-y-3" data-testid="my-interests-list">
            {interests.map((interest) => (
              <li
                key={interest.id}
                className="rounded-md border border-border bg-card px-4 py-3 space-y-1"
                data-testid="interest-item"
              >
                <p className="font-medium">{interest.course.title}</p>
                {interest.course.schoolName && (
                  <p className="text-sm text-muted-foreground">{interest.course.schoolName}</p>
                )}
                <p className="text-sm">
                  <span className="font-medium">{t("student.statusLabel")}: </span>
                  <span data-testid="interest-status">{interestStatusLabel(interest.status, t)}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DefaultLayout>
  );
};

export default StudentDashboardPage;
