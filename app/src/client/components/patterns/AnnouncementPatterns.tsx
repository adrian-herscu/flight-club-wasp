import { type ReactNode } from "react";

export function AnnouncementBanner({ children }: { children: ReactNode }) {
  return (
    <div className="from-accent to-secondary text-primary-foreground relative flex w-full items-center justify-center gap-3 bg-linear-to-r p-3 text-center font-semibold">
      {children}
    </div>
  );
}

export function AnnouncementTextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="hidden cursor-pointer transition-opacity hover:opacity-90 hover:drop-shadow-sm lg:block"
    >
      {children}
    </a>
  );
}

export function AnnouncementDivider() {
  return (
    <div className="bg-primary-foreground/20 hidden w-0.5 self-stretch lg:block" />
  );
}

export function AnnouncementButtonLinkDesktop({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-background/20 hover:bg-background/30 hidden cursor-pointer rounded-full px-2.5 py-1 text-xs tracking-wider transition-colors lg:block"
    >
      {children}
    </a>
  );
}

export function AnnouncementButtonLinkMobile({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-background/20 hover:bg-background/30 cursor-pointer rounded-full px-2.5 py-1 text-xs transition-colors lg:hidden"
    >
      {children}
    </a>
  );
}
