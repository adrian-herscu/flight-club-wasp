import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import DefaultLayout from "../system-admin/layout/DefaultLayout";
import { ListItem } from "../../client/components/patterns/ListItem";
import {
  EmptyText,
  LoadingText,
  PageRoot,
  PrimaryText,
  SimpleList,
  StackSection,
  SummaryGrid,
  TitledSection,
} from "../../client/components/patterns/PagePrimitives";
import { Card, CardContent, CardHeader, CardTitle } from "../../client/components/ui/card";

const { getMyInterests, getStudentFinancialDashboardSummary, useQuery } = operations as any;

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

type StudentFinancialDashboardSummary = {
  balances: {
    schoolId: string;
    schoolName: string;
    currency: string;
    effectiveBalanceMinor: number;
  }[];
  recentTransactions: {
    transactionId: string;
    createdAt: Date | string;
    amountMinor: number;
    currency: string;
    type: "DEPOSIT" | "WITHDRAWAL";
    description: string | null;
  }[];
};

function formatMoney(amountMinor: number, currency: string | null): string {
  return `${amountMinor.toLocaleString()} ${currency ?? "-"}`;
}

function formatInterestStatus(status: StudentInterestItem["status"], t: (key: string) => string): string {
  if (status === "INTERESTED") return t("student.statusInterested");
  if (status === "ENROLLED") return t("student.statusEnrolled");
  return t("student.statusCancelled");
}

const StudentDashboardPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();
  const { data: interestsData, isLoading } = useQuery(getMyInterests);
  const { data: financialSummaryData, isLoading: financialLoading } = useQuery(
    getStudentFinancialDashboardSummary,
  );
  const interests = (interestsData as StudentInterestItem[] | undefined) ?? [];
  const financialSummary =
    (financialSummaryData as StudentFinancialDashboardSummary | undefined) ?? null;

  return (
    <DefaultLayout user={user}>
      <PageRoot testId="student-dashboard-page">
        <TitledSection
          testId="student-dashboard-finance-section"
          title="My Finances"
        >
          {financialLoading ? (
            <LoadingText>{t("common.loading")}</LoadingText>
          ) : !financialSummary ? (
            <EmptyText>No financial data available.</EmptyText>
          ) : (
            <StackSection>
              <SummaryGrid>
                {financialSummary.balances.map((balance) => (
                  <Card key={balance.schoolId}>
                    <CardHeader>
                      <CardTitle>{balance.schoolName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PrimaryText>
                        {formatMoney(balance.effectiveBalanceMinor, balance.currency)}
                      </PrimaryText>
                    </CardContent>
                  </Card>
                ))}
              </SummaryGrid>

              <TitledSection
                testId="student-dashboard-transactions-section"
                title="Recent Transactions"
              >
                {financialSummary.recentTransactions.length === 0 ? (
                  <EmptyText>No transactions yet.</EmptyText>
                ) : (
                  <SimpleList>
                    {financialSummary.recentTransactions.map((tx) => (
                      <ListItem
                        key={tx.transactionId}
                        title={tx.description ?? "Transaction"}
                        subtitle={`${new Date(tx.createdAt).toLocaleDateString()} · ${tx.type}`}
                        status={formatMoney(tx.amountMinor, tx.currency)}
                      />
                    ))}
                  </SimpleList>
                )}
              </TitledSection>
            </StackSection>
          )}
        </TitledSection>

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
