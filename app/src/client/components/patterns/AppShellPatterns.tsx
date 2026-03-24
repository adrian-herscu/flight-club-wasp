import { type ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background text-foreground min-h-screen">{children}</div>
  );
}

export function AppContentWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-(--breakpoint-2xl)">{children}</div>
  );
}
