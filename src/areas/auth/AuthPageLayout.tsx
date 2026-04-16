import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "../../client/components/LanguageSelector";
import { AuthPageWrapper } from "../../client/components/patterns/AuthPageWrapper";
import { LanguageSelectorWrapper } from "../../client/components/patterns/LanguageSelectorWrapper";
import { AuthCenteredBox } from "../../client/components/patterns/AuthCenteredBox";
import { AuthContainer } from "../../client/components/patterns/AuthContainer";
import { AuthContainerTopOffset } from "../../client/components/patterns/AuthContainerTopOffset";

export function AuthPageLayout({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();

  return (
    <AuthPageWrapper>
      <LanguageSelectorWrapper dir={i18n.language === "he" ? "rtl" : "ltr"}>
        <LanguageSelector />
      </LanguageSelectorWrapper>

      <AuthCenteredBox>
        <AuthContainer>
          <AuthContainerTopOffset>{children}</AuthContainerTopOffset>
        </AuthContainer>
      </AuthCenteredBox>
    </AuthPageWrapper>
  );
}
