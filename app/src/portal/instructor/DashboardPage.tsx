import { type AuthUser } from "wasp/auth";
import DefaultLayout from "../../admin/layout/DefaultLayout";

const InstructorDashboardPage = ({ user }: { user: AuthUser }) => {
  return (
    <DefaultLayout user={user}>
      <div className="flex h-full items-center justify-center">
        <p data-testid="instructor-dashboard-placeholder" className="text-muted-foreground text-lg">
          Instructor Dashboard
        </p>
      </div>
    </DefaultLayout>
  );
};

export default InstructorDashboardPage;
