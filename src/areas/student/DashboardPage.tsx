import { type AuthUser } from "wasp/auth";
import DefaultLayout from "../system-admin/layout/DefaultLayout";
import { CenteredPlaceholder } from "../../client/components/patterns/AppStructure";

const StudentDashboardPage = ({ user }: { user: AuthUser }) => {
  return (
    <DefaultLayout user={user}>
      <CenteredPlaceholder testId="student-dashboard-placeholder">
        Under construction
      </CenteredPlaceholder>
    </DefaultLayout>
  );
};

export default StudentDashboardPage;
