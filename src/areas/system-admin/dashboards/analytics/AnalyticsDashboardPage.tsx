import { type AuthUser } from "wasp/auth";
import DefaultLayout from "../../layout/DefaultLayout";

import {
  DashboardPlaceholderContainer,
  DashboardPlaceholderText,
} from "../../../../client/components/patterns/AdminDashboardPatterns";
const Dashboard = ({ user }: { user: AuthUser }) => {
  return (
    <DefaultLayout user={user}>
      <DashboardPlaceholderContainer>
        <DashboardPlaceholderText testId="admin-dashboard-placeholder">
          Under construction
        </DashboardPlaceholderText>
      </DashboardPlaceholderContainer>
    </DefaultLayout>
  );
};

export default Dashboard;
