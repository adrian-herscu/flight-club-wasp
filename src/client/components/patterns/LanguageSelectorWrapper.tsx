import { ReactNode } from "react";

interface LanguageSelectorWrapperProps {
  children: ReactNode;
  dir: string;
}

/**
 * Wrapper for language selector positioned in top-right with directional support
 */
export function LanguageSelectorWrapper({ children, dir }: LanguageSelectorWrapperProps) {
  return (
    <div className="absolute inset-e-4 top-4">
      <div className="w-32" dir={dir}>
        {children}
      </div>
    </div>
  );
}
