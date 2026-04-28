import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import DefaultLayout from "../../system-admin/layout/DefaultLayout";
import { useManagedSchoolSelection } from "../../../features/school-context/useManagedSchoolSelection";
import {
  EmptyText,
  LoadingText,
  PageRoot,
  PrimaryText,
  SimpleList,
  StackSection,
  SummaryGrid,
  TitledSection,
} from "../../../client/components/patterns/PagePrimitives";
import { ListItem } from "../../../client/components/patterns/ListItem";
import { Card, CardContent, CardHeader, CardTitle } from "../../../client/components/ui/card";

const { getMyManagedSchool, getManagerFinancialDashboardSummary, useQuery } = operations as any;

type ManagedSchool = { id: string; name: string };

type ManagerFinancialDashboardSummary = {
  school: {
    id: string;
    name: string;
    currency: string;
    effectiveBalanceMinor: number;
  };
  pendingPayout: {
    count: number;
    amountMinor: number;
  };
  recentTopUps: {
    transactionId: string;
    createdAt: Date | string;
    amountMinor: number;
    currency: string;
    paymentMethod: string | null;
    externalReference: string | null;
    studentName: string;
  }[];
  fundingGaps: {
    interestId: string;
    studentName: string;
    courseTitle: string;
    fundingGapMinor: number;
    currency: string | null;
  }[];
};

function formatMoney(amountMinor: number, currency: string | null): string {
  const currencyLabel = currency ?? "-";
  return `${amountMinor.toLocaleString()} ${currencyLabel}`;
}

const SchoolManagerDashboardPage = ({ user }: { user: AuthUser }) => {
  const { data: schoolsData, isLoading: schoolsLoading } = useQuery(getMyManagedSchool);
  const schools = ((schoolsData as ManagedSchool[] | undefined) ?? []).map((school) => ({
    id: school.id,
    name: school.name,
  }));
  const { selectedSchoolId } = useManagedSchoolSelection(schools);

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery(
    getManagerFinancialDashboardSummary,
    selectedSchoolId ? { schoolId: selectedSchoolId } : undefined,
    { enabled: !schoolsLoading && !!selectedSchoolId },
  );

  const dashboard = dashboardData as ManagerFinancialDashboardSummary | undefined;
  const isLoading = schoolsLoading || dashboardLoading;

  return (
    <DefaultLayout user={user}>
      <PageRoot testId="school-manager-dashboard-page">
        {isLoading ? (
          <LoadingText>Loading dashboard…</LoadingText>
        ) : !dashboard ? (
          <EmptyText>No dashboard data available.</EmptyText>
        ) : (
          <StackSection>
            <SummaryGrid>
              <Card>
                <CardHeader>
                  <CardTitle>School Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <PrimaryText>
                    {formatMoney(
                      dashboard.school.effectiveBalanceMinor,
                      dashboard.school.currency,
                    )}
                  </PrimaryText>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pending Payouts</CardTitle>
                </CardHeader>
                <CardContent>
                  <PrimaryText>{dashboard.pendingPayout.count.toLocaleString()} payout(s)</PrimaryText>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pending Payout Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <PrimaryText>
                    {formatMoney(dashboard.pendingPayout.amountMinor, dashboard.school.currency)}
                  </PrimaryText>
                </CardContent>
              </Card>
            </SummaryGrid>

            <TitledSection testId="manager-recent-topups" title="Recent Top-ups">
              {dashboard.recentTopUps.length === 0 ? (
                <EmptyText>No recorded top-ups yet.</EmptyText>
              ) : (
                <SimpleList>
                  {dashboard.recentTopUps.map((topUp) => (
                    <ListItem
                      key={topUp.transactionId}
                      title={topUp.studentName}
                      subtitle={`${new Date(topUp.createdAt).toLocaleDateString()} · ${topUp.paymentMethod ?? "-"} · ${topUp.externalReference ?? "no ref"}`}
                      status={formatMoney(topUp.amountMinor, topUp.currency)}
                    />
                  ))}
                </SimpleList>
              )}
            </TitledSection>

            <TitledSection testId="manager-funding-gaps" title="Students Needing Funding">
              {dashboard.fundingGaps.length === 0 ? (
                <EmptyText>No active funding gaps.</EmptyText>
              ) : (
                <SimpleList>
                  {dashboard.fundingGaps.map((gap) => (
                    <ListItem
                      key={gap.interestId}
                      title={`${gap.studentName} · ${gap.courseTitle}`}
                      subtitle={`Interest ${gap.interestId}`}
                      status={formatMoney(gap.fundingGapMinor, gap.currency)}
                    />
                  ))}
                </SimpleList>
              )}
            </TitledSection>
          </StackSection>
        )}
      </PageRoot>
    </DefaultLayout>
  );
};

export default SchoolManagerDashboardPage;
