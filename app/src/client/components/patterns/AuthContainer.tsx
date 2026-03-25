import { ReactNode } from "react";

interface AuthContainerProps {
  children: ReactNode;
}

/**
 * Main container for auth pages with centered layout and shadow styling
 */
export function AuthContainer({ children }: AuthContainerProps) {
  return (
    <div className="px-4 py-8 shadow-xl ring-1 ring-gray-900/10 sm:rounded-lg sm:px-10">
      {children}
    </div>
  );
}
