import { ReactNode } from "react";

interface AuthTitleProps {
  children: ReactNode;
}

/**
 * Centered title for auth pages
 */
export function AuthTitle({ children }: AuthTitleProps) {
  return (
    <div className="text-center mb-6">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">
        {children}
      </h2>
    </div>
  );
}
