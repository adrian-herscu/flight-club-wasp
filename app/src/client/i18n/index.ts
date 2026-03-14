import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { he } from "./he";
import { ro } from "./ro";

const rtlLanguages = new Set(["he"]);
const supportedLanguages = new Set(["en", "he", "ro"]);

/** Returns the first browser-preferred language that this app supports, or "en". */
function detectBrowserLanguage(): string {
  if (typeof navigator === "undefined") return "en";
  const candidates = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const lang of candidates) {
    const base = lang.split("-")[0].toLowerCase();
    if (supportedLanguages.has(base)) return base;
  }
  return "en";
}

// i18next configuration
i18next
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
      ro: { translation: ro },
    },
    lng: typeof window !== "undefined"
      ? (localStorage.getItem("locale") || detectBrowserLanguage())
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
