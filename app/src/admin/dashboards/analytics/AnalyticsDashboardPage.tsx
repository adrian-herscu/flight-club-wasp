import { type AuthUser } from "wasp/auth";
import DefaultLayout from "../../layout/DefaultLayout";

const Dashboard = ({ user }: { user: AuthUser }) => {
  return (
    <DefaultLayout user={user}>
      <div className="flex h-full items-center justify-center">
        <p data-testid="admin-dashboard-placeholder" className="text-muted-foreground text-lg">
          Under construction
        </p>
      </div>
    </DefaultLayout>
  );
};

export default Dashboard;
