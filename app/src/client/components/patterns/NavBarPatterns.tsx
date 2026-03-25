import { LogIn, Menu } from "lucide-react";
import { type ReactNode } from "react";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { SheetContent, SheetTitle, SheetTrigger } from "../ui/sheet";
import logo from "../../static/logo.webp";
import { cn } from "../../utils";

export function NavStickyHeader({
  isScrolled,
  children,
}: {
  isScrolled: boolean;
  children: ReactNode;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        isScrolled && "top-4",
      )}
    >
      {children}
    </header>
  );
}

export function NavBarRoot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function NavScrollContainer({
  isScrolled,
  children,
}: {
  isScrolled: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("transition-all duration-300", {
        "bg-background/90 border-border mx-4 rounded-full border pr-2 shadow-lg backdrop-blur-lg md:mx-20 lg:pr-0":
          isScrolled,
        "bg-background/80 border-border mx-0 border-b backdrop-blur-lg":
          !isScrolled,
      })}
    >
      {children}
    </div>
  );
}

export function NavRow({
  isScrolled,
  children,
}: {
  isScrolled: boolean;
  children: ReactNode;
}) {
  return (
    <nav
      className={cn(
        "flex items-center justify-between transition-all duration-300",
        {
          "p-3 lg:px-6": isScrolled,
          "p-6 lg:px-8": !isScrolled,
        },
      )}
      aria-label="Global"
    >
      {children}
    </nav>
  );
}

export function NavBrandArea({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-6">{children}</div>;
}

export function NavBrandLink({ children }: { children: ReactNode }) {
  return (
    <WaspRouterLink
      to={routes.LandingPageRoute.to}
      className="text-foreground hover:text-primary flex items-center transition-colors duration-300 ease-in-out"
    >
      {children}
    </WaspRouterLink>
  );
}

export function NavLogoImage({ isScrolled }: { isScrolled: boolean }) {
  return (
    <img
      className={cn("transition-all duration-500", {
        "size-8": !isScrolled,
        "size-7": isScrolled,
      })}
      src={logo}
      alt="Your SaaS App"
    />
  );
}

export function NavAppNameText({
  isScrolled,
  children,
}: {
  isScrolled: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "text-foreground leading-6 font-semibold transition-all duration-300",
        {
          "ml-2 text-sm": !isScrolled,
          "ml-2 text-xs": isScrolled,
        },
      )}
    >
      {children}
    </span>
  );
}

export function NavDesktopPanel({ children }: { children: ReactNode }) {
  return (
    <div className="hidden items-center justify-end gap-3 lg:flex lg:flex-1">
      {children}
    </div>
  );
}

export function NavIconRow({ children }: { children: ReactNode }) {
  return (
    <ul className="flex items-center justify-center gap-2 sm:gap-4">
      {children}
    </ul>
  );
}

export function NavUserWrapper({ children }: { children: ReactNode }) {
  return <div className="ml-3">{children}</div>;
}

export function NavDesktopLoginLink({
  isScrolled,
  children,
}: {
  isScrolled: boolean;
  children: ReactNode;
}) {
  return (
    <WaspRouterLink
      to={routes.LoginRoute.to}
      className={cn("ml-3 leading-6 font-semibold transition-all duration-300", {
        "text-sm": !isScrolled,
        "text-xs": isScrolled,
      })}
    >
      {children}
    </WaspRouterLink>
  );
}

export function NavDesktopLoginInner({ children }: { children: ReactNode }) {
  return (
    <div className="text-foreground hover:text-primary flex items-center transition-colors duration-300 ease-in-out">
      {children}
    </div>
  );
}

export function NavDesktopLoginIcon({ isScrolled }: { isScrolled: boolean }) {
  return (
    <LogIn
      size={isScrolled ? "1rem" : "1.1rem"}
      className={cn("transition-all duration-300", {
        "mt-[0.1rem] ml-1": !isScrolled,
        "ml-1": isScrolled,
      })}
    />
  );
}

export function NavMobilePanel({ children }: { children: ReactNode }) {
  return <div className="flex lg:hidden">{children}</div>;
}

export function NavMobileMenuTrigger({
  isScrolled,
  label,
}: {
  isScrolled: boolean;
  label: string;
}) {
  return (
    <SheetTrigger asChild>
      <button
        type="button"
        className={cn(
          "text-muted-foreground hover:text-muted hover:bg-accent inline-flex items-center justify-center rounded-md transition-colors",
        )}
      >
        <span className="sr-only">{label}</span>
        <Menu
          className={cn("transition-all duration-300", {
            "size-8 p-1": !isScrolled,
            "size-6 p-0.5": isScrolled,
          })}
          aria-hidden="true"
        />
      </button>
    </SheetTrigger>
  );
}

export function NavSheetPanel({
  isRTL,
  children,
}: {
  isRTL: boolean;
  children: ReactNode;
}) {
  return (
    <SheetContent side={isRTL ? "right" : "left"} className="w-75 sm:w-100">
      {children}
    </SheetContent>
  );
}

export function NavSheetTitle({ children }: { children: ReactNode }) {
  return <SheetTitle className="flex items-center">{children}</SheetTitle>;
}

export function NavMobileLogoLinkFull({ appName }: { appName: string }) {
  return (
    <WaspRouterLink to={routes.LandingPageRoute.to}>
      <span className="sr-only">{appName}</span>
      <img
        className="size-8 transition-all duration-500"
        src={logo}
        alt="Your SaaS App"
      />
    </WaspRouterLink>
  );
}

export function NavMobileContent({ children }: { children: ReactNode }) {
  return <div className="mt-6 flow-root">{children}</div>;
}

export function NavMobileDivider({ children }: { children: ReactNode }) {
  return <div className="divide-border -my-6 divide-y">{children}</div>;
}

export function NavMobileSection({ children }: { children: ReactNode }) {
  return <div className="py-6">{children}</div>;
}

export function NavMobileLoginLink({ children }: { children: ReactNode }) {
  return (
    <WaspRouterLink to={routes.LoginRoute.to}>{children}</WaspRouterLink>
  );
}

export function NavMobileLoginInner({ children }: { children: ReactNode }) {
  return (
    <div className="text-foreground hover:text-primary flex items-center justify-end transition-colors duration-300 ease-in-out">
      {children}
    </div>
  );
}

export function NavMobileLoginIcon() {
  return <LogIn size="1.1rem" className="ml-1" />;
}

export function NavMobileUserMenu({ children }: { children: ReactNode }) {
  return <ul className="space-y-2">{children}</ul>;
}

export function NavMobileIconStack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}
