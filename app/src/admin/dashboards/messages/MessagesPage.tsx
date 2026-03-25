// TODO: Add messages page
import type { AuthUser } from "wasp/auth";
import { useTranslation } from "react-i18next";
import DefaultLayout from "../../layout/DefaultLayout";
import { MessagesPageText } from "../../../client/components/patterns/AdminMessagePatterns";

function AdminMessages({ user }: { user: AuthUser }) {
  const { t } = useTranslation();

  return (
    <DefaultLayout user={user}>
      <MessagesPageText>{t("admin.messagesPageMessage")}</MessagesPageText>
    </DefaultLayout>
  );
}

export default AdminMessages;
