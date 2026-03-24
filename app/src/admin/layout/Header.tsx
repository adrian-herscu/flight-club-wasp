import { type AuthUser } from "wasp/auth";
import DarkModeSwitcher from "../../client/components/DarkModeSwitcher";
import { LanguageSelector } from "../../client/components/LanguageSelector";
import {
  HeaderRoot,
  HeaderContent,
  HamburgerButtonWrapper,
  HamburgerButton,
  HeaderToolbar,
  HeaderActions,
} from "../../client/components/patterns/AdminHeaderPatterns";
import { UserDropdown } from "../../user/UserDropdown";
import MessageButton from "../dashboards/messages/MessageButton";

const Header = (props: {
  sidebarOpen: string | boolean | undefined;
  setSidebarOpen: (arg0: boolean) => void;
  user: AuthUser;
}) => {
  return (
    <HeaderRoot>
      <HeaderContent>
        <HamburgerButtonWrapper>
          {/* <!-- Hamburger Toggle BTN --> */}
          <HamburgerButton
            onClick={() => props.setSidebarOpen(!props.sidebarOpen)}
            isOpen={props.sidebarOpen}
          />
          {/* <!-- Hamburger Toggle BTN --> */}
        </HamburgerButtonWrapper>

        <HeaderToolbar>
          {/* <!-- Dark Mode Toggler --> */}
          <LanguageSelector />
          <DarkModeSwitcher />
          {/* <!-- Dark Mode Toggler --> */}

          {/* <!-- Chat Notification Area --> */}
          <MessageButton />
          {/* <!-- Chat Notification Area --> */}
        </HeaderToolbar>

        <HeaderActions>
          {/* <!-- User Area --> */}
          <UserDropdown user={props.user} />
          {/* <!-- User Area --> */}
        </HeaderActions>
      </HeaderContent>
    </HeaderRoot>
  );
};

export default Header;
