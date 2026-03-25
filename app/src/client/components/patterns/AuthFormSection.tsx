import { ReactNode } from "react";

interface AuthFormSectionProps {
  children: ReactNode;
}

/**
 * Wrapper for email form input groups with consistent spacing
 */
export function AuthFormSection({ children }: AuthFormSectionProps) {
  return <div className="space-y-6">{children}</div>;
}
