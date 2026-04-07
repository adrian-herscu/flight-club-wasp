import { type AuthUser } from "wasp/auth";
import { type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import DarkModeSwitcher from "../../client/components/DarkModeSwitcher";
import { LanguageSelector } from "../../client/components/LanguageSelector";
import {
  HeaderRoot,
  HeaderContent,
  HeaderActions,
  HeaderDesktopActionsContainer,
} from "../../client/components/patterns/AdminHeaderPatterns";
import {
  NavStickyHeader,
  NavScrollContainer,
  NavRow,
  NavBrandArea,
  NavBrandLink,
  NavLogoImage,
  NavAppNameText,
  NavMobileMenuFloatingToggle,
} from "../../client/components/patterns/NavBarPatterns";
import { UserDropdown } from "../../user/UserDropdown";

const Header = (props: {
  sidebarOpen: string | boolean | undefined;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  isDesktop: boolean;
  user: AuthUser;
}) => {
  const { t } = useTranslation();

  // Actions cluster — shared between desktop and mobile
  const actions = (
    <HeaderActions>
      <LanguageSelector />
      <DarkModeSwitcher />
      <UserDropdown user={props.user} />
    </HeaderActions>
  );

  if (!props.isDesktop) {
    return (
      <NavStickyHeader isScrolled={false}>
        <NavScrollContainer isScrolled={false}>
          <NavRow isScrolled={false}>
            <NavMobileMenuFloatingToggle
              isScrolled={false}
              label={t("nav.openMainMenu")}
              ariaControls="sidebar"
              onClick={() => props.setSidebarOpen((prev) => !prev)}
            />
            <NavBrandArea>
              <NavBrandLink>
                <NavLogoImage isScrolled={false} />
                <NavAppNameText isScrolled={false}>
                  {t("nav.appName")}
                </NavAppNameText>
              </NavBrandLink>
            </NavBrandArea>
          </NavRow>
        </NavScrollContainer>
      </NavStickyHeader>
    );
  }

  return (
    <HeaderRoot>
      <HeaderContent>
        <HeaderDesktopActionsContainer>
          {actions}
        </HeaderDesktopActionsContainer>
      </HeaderContent>
    </HeaderRoot>
  );
};

export default Header;
