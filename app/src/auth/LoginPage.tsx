import { useTranslation } from "react-i18next";
import { TranslatedLoginForm } from "./TranslatedLoginForm";
import { routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";
import { useEffect, useState } from "react";
import { AuthInlineLink } from "./AuthInlineLink";
import { AuthTitle } from "../client/components/patterns/AuthTitle";

export default function Login() {
  const { t, i18n } = useTranslation();
  const [key, setKey] = useState(0);

  // Rerender form when language changes for RTL layout
  useEffect(() => {
    const handleLanguageChange = () => {
      setKey((prev) => prev + 1);
    };
    
    i18n.on("languageChanged", handleLanguageChange);
    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, [i18n]);

  return (
    <AuthPageLayout>
      <AuthTitle>
        {t("auth.loginTitle")}
      </AuthTitle>
      <TranslatedLoginForm key={key} />
      <br />
      <AuthInlineLink
        prefix={t("auth.dontHaveAccount")}
        to={routes.SignupRoute.to}
        linkText={t("auth.signup")}
      />
      <br />
      <AuthInlineLink
        prefix={t("auth.forgotPassword")}
        to={routes.RequestPasswordResetRoute.to}
        linkText={t("auth.resetIt")}
      />
    </AuthPageLayout>
  );
}
