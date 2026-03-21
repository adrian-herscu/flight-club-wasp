import { type AuthUser } from "wasp/auth";
import DefaultLayout from "../../admin/layout/DefaultLayout";

const StudentDashboardPage = ({ user }: { user: AuthUser }) => {
  return (
    <DefaultLayout user={user}>
      <div className="flex h-full items-center justify-center">
        <p data-testid="student-dashboard-placeholder" className="text-muted-foreground text-lg">
          Student Dashboard
        </p>
      </div>
    </DefaultLayout>
  );
};

export default StudentDashboardPage;
