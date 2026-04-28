import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import DefaultLayout from "../system-admin/layout/DefaultLayout";
import { useInstructorSchoolSelection } from "../../features/school-context/useInstructorSchoolSelection";
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

const {
  getInstructorSchools,
  getInstructorFinancialDashboardSummary,
  useQuery,
} = operations as any;

type InstructorSchool = { id: string; name: string };

type InstructorFinancialDashboardSummary = {
  pendingAmountMinor: number;
  paidAmountMinor: number;
  currency: string | null;
  payouts: {
    payoutId: string;
    courseTitle: string;
    lessonDate: Date | string;
    amountMinor: number;
    currency: string;
    status: string;
    paymentMethod: string | null;
    paidAt: Date | string | null;
  }[];
};

function formatMoney(amountMinor: number, currency: string | null): string {
  return `${amountMinor.toLocaleString()} ${currency ?? "-"}`;
}

const InstructorDashboardPage = ({ user }: { user: AuthUser }) => {
  const { data: schoolsData, isLoading: schoolsLoading } = useQuery(getInstructorSchools);
  const schools = (schoolsData as InstructorSchool[] | undefined) ?? [];
  const { selectedSchoolId } = useInstructorSchoolSelection(schools);

  const { data: summaryData, isLoading: summaryLoading } = useQuery(
    getInstructorFinancialDashboardSummary,
    selectedSchoolId ? { schoolId: selectedSchoolId } : undefined,
    { enabled: !schoolsLoading && !!selectedSchoolId },
  );
  const summary = summaryData as InstructorFinancialDashboardSummary | undefined;

  const isLoading = schoolsLoading || summaryLoading;

  return (
    <DefaultLayout user={user}>
      <PageRoot testId="instructor-dashboard-page">
        {isLoading ? (
          <LoadingText>Loading dashboard…</LoadingText>
        ) : !summary ? (
          <EmptyText>No dashboard data available.</EmptyText>
        ) : (
          <StackSection>
            <SummaryGrid>
              <Card>
                <CardHeader>
                  <CardTitle>Pending Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <PrimaryText>{formatMoney(summary.pendingAmountMinor, summary.currency)}</PrimaryText>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Paid Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <PrimaryText>{formatMoney(summary.paidAmountMinor, summary.currency)}</PrimaryText>
                </CardContent>
              </Card>
            </SummaryGrid>

            <TitledSection testId="instructor-payout-history" title="Payout History">
              {summary.payouts.length === 0 ? (
                <EmptyText>No payout records yet.</EmptyText>
              ) : (
                <SimpleList>
                  {summary.payouts.map((payout) => (
                    <ListItem
                      key={payout.payoutId}
                      title={payout.courseTitle}
                      subtitle={`${new Date(payout.lessonDate).toLocaleDateString()} · ${payout.status} · ${payout.paymentMethod ?? "-"}`}
                      status={formatMoney(payout.amountMinor, payout.currency)}
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

export default InstructorDashboardPage;
