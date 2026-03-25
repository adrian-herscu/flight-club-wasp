import { ReactNode } from "react";

interface AuthInputGroupProps {
  children: ReactNode;
}

/**
 * Group wrapper for form input with label
 */
export function AuthInputGroup({ children }: AuthInputGroupProps) {
  return <div>{children}</div>;
}
