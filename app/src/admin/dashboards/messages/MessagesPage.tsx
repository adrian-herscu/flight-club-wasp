// TODO: Add messages page
import type { AuthUser } from "wasp/auth";
import { useTranslation } from "react-i18next";
import DefaultLayout from "../../layout/DefaultLayout";

function AdminMessages({ user }: { user: AuthUser }) {
  const { t } = useTranslation();

  return (
    <DefaultLayout user={user}>
      <div>{t("admin.messagesPageMessage")}</div>
    </DefaultLayout>
  );
}

export default AdminMessages;
