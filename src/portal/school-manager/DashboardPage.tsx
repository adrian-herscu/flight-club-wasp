import { type AuthUser } from "wasp/auth";
import DefaultLayout from "../../admin/layout/DefaultLayout";
import { CenteredPlaceholder } from "../../client/components/patterns/AppStructure";

const SchoolManagerDashboardPage = ({ user }: { user: AuthUser }) => {
  return (
    <DefaultLayout user={user}>
      <CenteredPlaceholder testId="school-manager-dashboard-placeholder">
        School Manager Dashboard
      </CenteredPlaceholder>
    </DefaultLayout>
  );
};

export default SchoolManagerDashboardPage;
