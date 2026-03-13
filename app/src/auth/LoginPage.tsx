import { useTranslation } from "react-i18next";
import { TranslatedLoginForm } from "./TranslatedLoginForm";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";
import { useEffect, useState } from "react";

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
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          {t("auth.loginTitle")}
        </h2>
      </div>
      <TranslatedLoginForm key={key} />
      <br />
      <span className="text-sm font-medium text-gray-900">
        {t("auth.dontHaveAccount")}{" "}
        <WaspRouterLink to={routes.SignupRoute.to} className="underline">
          {t("auth.signup")}
        </WaspRouterLink>
      </span>
      <br />
      <span className="text-sm font-medium text-gray-900">
        {t("auth.forgotPassword")}{" "}
        <WaspRouterLink to={routes.RequestPasswordResetRoute.to} className="underline">
          {t("auth.resetIt")}
        </WaspRouterLink>
      </span>
    </AuthPageLayout>
  );
}
