import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../client/components/ui/button";

export function AuthPageLayout({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "he" : "en";
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="flex min-h-full flex-col justify-center pt-10 sm:px-6 lg:px-8">
      {/* Language selector in top-right */}
      <div className="absolute inset-e-4 top-4">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          className="text-xs font-medium"
        >
          {i18n.language === "en" ? "עברית" : "English"}
        </Button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-4 py-8 shadow-xl ring-1 ring-gray-900/10 sm:rounded-lg sm:px-10 dark:bg-white dark:text-gray-900">
          <div className="-mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
