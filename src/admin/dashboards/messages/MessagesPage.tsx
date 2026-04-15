import type { AuthUser } from "wasp/auth";
import { useTranslation } from "react-i18next";
import DefaultLayout from "../../layout/DefaultLayout";
import { MutedText } from "../../../client/components/patterns/PagePrimitives";

function AdminMessages({ user }: { user: AuthUser }) {
  const { t } = useTranslation();

  return (
    <DefaultLayout user={user}>
      <MutedText>{t("admin.messagesPageMessage")}</MutedText>
    </DefaultLayout>
  );
}

export default AdminMessages;
