import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { he } from "./he";
import { ro } from "./ro";

const rtlLanguages = new Set(["he"]);

// i18next configuration
i18next
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
      ro: { translation: ro },
    },
    lng: typeof window !== "undefined" ? 
      (localStorage.getItem("locale") || document.documentElement.lang || "en") 
      : "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    ns: ["translation"],
    defaultNS: "translation",
  });

// Set document attributes when language changes
i18next.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
  document.documentElement.dir = rtlLanguages.has(lng) ? "rtl" : "ltr";
  localStorage.setItem("locale", lng);
});

// Initialize document attributes on app load
const initialLng = i18next.language;
document.documentElement.lang = initialLng;
document.documentElement.dir = rtlLanguages.has(initialLng) ? "rtl" : "ltr";

export default i18next;
