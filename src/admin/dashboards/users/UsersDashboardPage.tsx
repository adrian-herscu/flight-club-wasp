import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";
import { type AuthUser } from "wasp/auth";
import { UsersBox } from "../../../client/components/patterns/UsersDashboardPatterns";
import Breadcrumb from "../../layout/Breadcrumb";
import DefaultLayout from "../../layout/DefaultLayout";
import UsersTable from "./UsersTable";

const Users = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();

  if (!user.isSystemAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName={t("admin.usersPageTitle")} />
      <UsersBox variant="pageContent">
        <UsersTable />
      </UsersBox>
    </DefaultLayout>
  );
};

export default Users;
