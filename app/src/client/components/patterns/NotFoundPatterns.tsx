import { type ReactNode } from "react";
import { Link as WaspRouterLink, routes } from "wasp/client/router";

export function NotFoundPageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      {children}
    </div>
  );
}

export function NotFoundPageCard({ children }: { children: ReactNode }) {
  return <div className="text-center">{children}</div>;
}

export function NotFoundHeading({ children }: { children: ReactNode }) {
  return <h1 className="mb-4 text-6xl font-bold">{children}</h1>;
}

export function NotFoundMessage({ children }: { children: ReactNode }) {
  return <p className="text-bodydark mb-8 text-lg">{children}</p>;
}

export function NotFoundHomeLink({ children }: { children: ReactNode }) {
  return (
    <WaspRouterLink
      to={routes.LandingPageRoute.to}
      className="text-accent-foreground bg-accent hover:bg-accent/90 inline-block rounded-lg px-8 py-3 font-semibold transition duration-300"
    >
      {children}
    </WaspRouterLink>
  );
}
