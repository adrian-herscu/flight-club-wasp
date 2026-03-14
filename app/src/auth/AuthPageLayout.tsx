import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "../client/components/LanguageSelector";

export function AuthPageLayout({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();

  return (
    <div className="flex min-h-full flex-col justify-center pt-10 sm:px-6 lg:px-8">
      {/* Language selector in top-right */}
      <div className="absolute inset-e-4 top-4">
        <div className="w-32" dir={i18n.language === "he" ? "rtl" : "ltr"}>
          <LanguageSelector />
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-4 py-8 shadow-xl ring-1 ring-gray-900/10 sm:rounded-lg sm:px-10 dark:bg-white dark:text-gray-900">
          <div className="-mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
