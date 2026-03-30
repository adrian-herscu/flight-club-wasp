import { type AuthUser } from "wasp/auth";
import DarkModeSwitcher from "../../client/components/DarkModeSwitcher";
import { LanguageSelector } from "../../client/components/LanguageSelector";
import {
  HeaderRoot,
  HeaderContent,
  HamburgerButtonWrapper,
  HamburgerButton,
  HeaderActions,
  HeaderDesktopActionsContainer,
} from "../../client/components/patterns/AdminHeaderPatterns";
import { UserDropdown } from "../../user/UserDropdown";

const Header = (props: {
  sidebarOpen: string | boolean | undefined;
  setSidebarOpen: (arg0: boolean) => void;
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

  return (
    <HeaderRoot>
      <HeaderContent>
        {props.isDesktop ? (
          // On desktop the sidebar is always visible.
          // justify-content:flex-end naturally places actions at the
          // physical RIGHT in LTR and physical LEFT in RTL, keeping them
          // away from the sidebar in both directions.
          <HeaderDesktopActionsContainer>
            {actions}
          </HeaderDesktopActionsContainer>
        ) : (
          // On mobile show the hamburger on the inline-start side and
          // actions on the inline-end side (space-between from HeaderContent).
          <>
            <HamburgerButtonWrapper>
              <HamburgerButton
                onClick={() => props.setSidebarOpen(!props.sidebarOpen)}
                isOpen={props.sidebarOpen}
              />
            </HamburgerButtonWrapper>
            {actions}
          </>
        )}
      </HeaderContent>
    </HeaderRoot>
  );
};

export default Header;
