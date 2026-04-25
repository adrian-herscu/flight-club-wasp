import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
// import { Dispatch, SetStateAction } from "react";
// import { Link as ReactRouterLink } from "react-router";
import { useAuth } from "wasp/client/auth";
import { Sheet, SheetHeader } from "../ui/sheet";
import { throttleWithTrailingInvocation } from "../../../shared/utils";
import { UserDropdown } from "../../../areas/account/profile/UserDropdown";
import { UserMenuItems } from "../../../areas/account/profile/UserMenuItems";
import { DevLoginMenu } from "./DevLoginMenu";
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
  NavMobileMenuFloatingToggle,
  NavMobilePanel,
  NavMobileSection,
  NavMobileUserIdentity,
  NavMobileUserMenu,
  NavRow,
  NavScrollContainer,
  NavSheetPanel,
  NavSheetTopRow,
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
            <NavBarMobileMenu
              isScrolled={isScrolled}
              navigationItems={navigationItems}
            />
            <NavBrandArea>
              <NavBrandLink>
                <NavLogoImage isScrolled={isScrolled} />
                <NavAppNameText isScrolled={isScrolled}>
                  {t("nav.appName")}
                </NavAppNameText>
              </NavBrandLink>
            </NavBrandArea>
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
      <DevLoginMenu />
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
  const currentUser = user as {
    fullName?: string | null;
    email?: string | null;
  } | null;

  const handleSheetInteractOutside = (event: Event) => {
    const target = event.target as Element | null;
    if (!target) {
      return;
    }

    if (
      target.closest("[data-radix-popper-content-wrapper]") ||
      target.closest("[role='listbox']") ||
      target.closest("[role='option']") ||
      target.closest("[data-slot='select-content']") ||
      target.closest("[data-slot='select-item']")
    ) {
      event.preventDefault();
    }
  };

  return (
    <NavMobilePanel>
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <NavMobileMenuTrigger
          isScrolled={isScrolled}
          label={t("nav.openMainMenu")}
        />

        <NavSheetPanel isRTL={isRTL} onInteractOutside={handleSheetInteractOutside}>
          <SheetHeader>
            <NavSheetTopRow isRTL={isRTL}>
              <NavMobileMenuFloatingToggle
                isScrolled={isScrolled}
                label={t("nav.openMainMenu")}
                onClick={() => setMobileMenuOpen(false)}
              />
              <NavSheetTitle>
                <NavMobileLogoLinkFull appName={t("nav.appName")} />
              </NavSheetTitle>
            </NavSheetTopRow>
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
                    <NavMobileUserIdentity>
                      {currentUser?.fullName ?? currentUser?.email ?? t("common.user")}
                    </NavMobileUserIdentity>
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
