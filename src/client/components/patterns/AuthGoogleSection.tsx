import { ReactNode } from "react";

interface AuthGoogleSectionProps {
  children: ReactNode;
  label: string;
}

/**
 * Section wrapper for Google sign-in with label and centered layout
 */
export function AuthGoogleSection({ children, label }: AuthGoogleSectionProps) {
  return (
    <div className="space-y-3 text-center">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="flex justify-center">
        {children}
      </div>
    </div>
  );
}
