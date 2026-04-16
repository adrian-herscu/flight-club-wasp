import { type AuthUser } from "wasp/auth";
import DefaultLayout from "../system-admin/layout/DefaultLayout";
import { CenteredPlaceholder } from "../../client/components/patterns/AppStructure";

const InstructorDashboardPage = ({ user }: { user: AuthUser }) => {
  return (
    <DefaultLayout user={user}>
      <CenteredPlaceholder testId="instructor-dashboard-placeholder">
        Under construction
      </CenteredPlaceholder>
    </DefaultLayout>
  );
};

export default InstructorDashboardPage;
