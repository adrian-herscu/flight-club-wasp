import { useTranslation } from "react-i18next";
import { SignupForm } from "wasp/client/auth";
import { routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";
import { AuthInlineLink } from "./AuthInlineLink";

export function Signup() {
  const { t } = useTranslation();

  return (
    <AuthPageLayout>
      <SignupForm />
      <br />
      <AuthInlineLink
        prefix={`${t("auth.alreadyHaveAccount")} (`}
        to={routes.LoginRoute.to}
        linkText={t("auth.goToLogin")}
        suffix=")."
      />
      <br />
    </AuthPageLayout>
  );
}
