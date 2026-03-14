import { type AuthUser } from "wasp/auth";
import { useTranslation } from "react-i18next";
import DefaultLayout from "../../layout/DefaultLayout";

const Dashboard = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();

  return (
    <DefaultLayout user={user}>
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-lg">{t("admin.analyticsDashboardDisabled")}</p>
      </div>
    </DefaultLayout>
  );
};

export default Dashboard;
