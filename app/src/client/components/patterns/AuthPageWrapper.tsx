import { ReactNode } from "react";

interface AuthPageWrapperProps {
  children: ReactNode;
  dir?: string;
}

/**
 * Page-level wrapper for auth pages with flex layout and top padding
 */
export function AuthPageWrapper({ children, dir }: AuthPageWrapperProps) {
  return (
    <div className="flex min-h-full flex-col justify-center pt-10 sm:px-6 lg:px-8" dir={dir}>
      {children}
    </div>
  );
}
