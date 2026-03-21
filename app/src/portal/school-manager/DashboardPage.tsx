import { type AuthUser } from "wasp/auth";
import DefaultLayout from "../../admin/layout/DefaultLayout";

const SchoolManagerDashboardPage = ({ user }: { user: AuthUser }) => {
  return (
    <DefaultLayout user={user}>
      <div className="flex h-full items-center justify-center">
        <p data-testid="school-manager-dashboard-placeholder" className="text-muted-foreground text-lg">
          School Manager Dashboard
        </p>
      </div>
    </DefaultLayout>
  );
};

export default SchoolManagerDashboardPage;
