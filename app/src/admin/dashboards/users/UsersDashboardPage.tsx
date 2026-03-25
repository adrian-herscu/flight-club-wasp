import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";
import { type AuthUser } from "wasp/auth";
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
      <div className="flex flex-col gap-10">
        <UsersTable />
      </div>
    </DefaultLayout>
  );
};

export default Users;
