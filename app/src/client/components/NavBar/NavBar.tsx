import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
// import { Dispatch, SetStateAction } from "react";
// import { Link as ReactRouterLink } from "react-router";
import { useAuth } from "wasp/client/auth";
import { Sheet, SheetHeader } from "../ui/sheet";
import { throttleWithTrailingInvocation } from "../../../shared/utils";
import { UserDropdown } from "../../../user/UserDropdown";
import { UserMenuItems } from "../../../user/UserMenuItems";
// import { useIsLandingPage } from "../../hooks/useIsLandingPage";
import DarkModeSwitcher from "../DarkModeSwitcher";
import { LanguageSelector } from "../LanguageSelector";
// import { Announcement } from "./Announcement";
import {
  NavBarRoot,
  NavAppNameText,
  NavBrandArea,
  NavBrandLink,
  NavDesktopLoginIcon,
  NavDesktopLoginInner,
  NavDesktopLoginLink,
  NavDesktopPanel,
  NavIconRow,
  NavLogoImage,
  NavMobileContent,
  NavMobileDivider,
  NavMobileIconStack,
  NavMobileLoginIcon,
  NavMobileLoginInner,
  NavMobileLoginLink,
  NavMobileLogoLinkFull,
  NavMobileMenuTrigger,
  NavMobilePanel,
  NavMobileSection,
  NavMobileUserMenu,
  NavRow,
  NavScrollContainer,
  NavSheetPanel,
  NavSheetTitle,
  NavStickyHeader,
  NavUserWrapper,
} from "../patterns/NavBarPatterns";

export interface NavigationItem {
  name: string;
  to: string;
}

export default function NavBar({
  navigationItems,
}: {
  navigationItems: NavigationItem[];
}) {
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  // const isLandingPage = useIsLandingPage();

  useEffect(() => {
    const throttledHandler = throttleWithTrailingInvocation(() => {
      setIsScrolled(window.scrollY > 0);
    }, 50);

    window.addEventListener("scroll", throttledHandler);

    return () => {
      window.removeEventListener("scroll", throttledHandler);
      throttledHandler.cancel();
    };
  }, []);

  return (
    <NavBarRoot>
      {/* {isLandingPage && <Announcement />} */}
      <NavStickyHeader isScrolled={isScrolled}>
        <NavScrollContainer isScrolled={isScrolled}>
          <NavRow isScrolled={isScrolled}>
            <NavBrandArea>
              <NavBrandLink>
                <NavLogoImage isScrolled={isScrolled} />
                <NavAppNameText isScrolled={isScrolled}>
                  {t("nav.appName")}
                </NavAppNameText>
              </NavBrandLink>
            </NavBrandArea>
            <NavBarMobileMenu
              isScrolled={isScrolled}
              navigationItems={navigationItems}
            />
            <NavBarDesktopUserDropdown isScrolled={isScrolled} />
          </NavRow>
        </NavScrollContainer>
      </NavStickyHeader>
    </NavBarRoot>
  );
}

function NavBarDesktopUserDropdown({ isScrolled }: { isScrolled: boolean }) {
  const { t } = useTranslation();
  const { data: user, isLoading: isUserLoading } = useAuth();

  return (
    <NavDesktopPanel>
      <NavIconRow>
        <LanguageSelector />
        <DarkModeSwitcher />
      </NavIconRow>
      {isUserLoading ? null : !user ? (
        <NavDesktopLoginLink isScrolled={isScrolled}>
          <NavDesktopLoginInner>
            {t("nav.logIn")}{" "}
            <NavDesktopLoginIcon isScrolled={isScrolled} />
          </NavDesktopLoginInner>
        </NavDesktopLoginLink>
      ) : (
        <NavUserWrapper>
          <UserDropdown user={user} />
        </NavUserWrapper>
      )}
    </NavDesktopPanel>
  );
}

function NavBarMobileMenu({
  isScrolled,
  navigationItems,
}: {
  isScrolled: boolean;
  navigationItems: NavigationItem[];
}) {
  const { t } = useTranslation();
  const { data: user, isLoading: isUserLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isRTL = typeof document !== "undefined" && document.documentElement.dir === "rtl";

  return (
    <NavMobilePanel>
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <NavMobileMenuTrigger
          isScrolled={isScrolled}
          label={t("nav.openMainMenu")}
        />
        <NavSheetPanel isRTL={isRTL}>
          <SheetHeader>
            <NavSheetTitle>
              <NavMobileLogoLinkFull appName={t("nav.appName")} />
            </NavSheetTitle>
          </SheetHeader>
          <NavMobileContent>
            <NavMobileDivider>
              <NavMobileSection>
                {isUserLoading ? null : !user ? (
                  <NavMobileLoginLink>
                    <NavMobileLoginInner>
                      {t("nav.logIn")} <NavMobileLoginIcon />
                    </NavMobileLoginInner>
                  </NavMobileLoginLink>
                ) : (
                  <NavMobileUserMenu>
                    <UserMenuItems
                      user={user}
                      onItemClick={() => setMobileMenuOpen(false)}
                    />
                  </NavMobileUserMenu>
                )}
              </NavMobileSection>
              <NavMobileSection>
                <NavMobileIconStack>
                  <LanguageSelector />
                  <DarkModeSwitcher />
                </NavMobileIconStack>
              </NavMobileSection>
            </NavMobileDivider>
          </NavMobileContent>
        </NavSheetPanel>
      </Sheet>
    </NavMobilePanel>
  );
}
