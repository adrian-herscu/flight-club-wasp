import { type AuthUser } from "wasp/auth";
import { type Dispatch, type SetStateAction } from "react";
import DarkModeSwitcher from "../../client/components/DarkModeSwitcher";
import { LanguageSelector } from "../../client/components/LanguageSelector";
import {
  HeaderRoot,
  HeaderContent,
  HamburgerButtonWrapper,
  HamburgerButton,
  HeaderActions,
  HeaderDesktopActionsContainer,
  HeaderMobileFloatingBar,
  HeaderMobileSpacer,
} from "../../client/components/patterns/AdminHeaderPatterns";
import { NavLink } from "react-router";
import { SidebarLogoImage } from "../../client/components/patterns/AdminSidebarPatterns";
import { UserDropdown } from "../../user/UserDropdown";

const Header = (props: {
  sidebarOpen: string | boolean | undefined;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  isDesktop: boolean;
  user: AuthUser;
}) => {
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
      <>
        <HeaderMobileSpacer />
        <HeaderMobileFloatingBar>
          <HamburgerButtonWrapper>
            <HamburgerButton
              onClick={() => props.setSidebarOpen((prev) => !prev)}
              isOpen={props.sidebarOpen}
            />
          </HamburgerButtonWrapper>
          <NavLink to="/" aria-label="Flight Club home">
            <SidebarLogoImage src="/favicon.svg" alt="Flight Club" />
          </NavLink>
        </HeaderMobileFloatingBar>
      </>
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
