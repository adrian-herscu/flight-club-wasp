import { ReactNode } from "react";

interface AuthCenteredBoxProps {
  children: ReactNode;
}

/**
 * Centered box for auth page content
 */
export function AuthCenteredBox({ children }: AuthCenteredBoxProps) {
  return <div className="sm:mx-auto sm:w-full sm:max-w-md">{children}</div>;
}
