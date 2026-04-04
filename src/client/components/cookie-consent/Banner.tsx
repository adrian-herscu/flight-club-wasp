import { useEffect } from "react";
import * as CookieConsent from "vanilla-cookieconsent";
import "vanilla-cookieconsent/dist/cookieconsent.css";
import i18next from "../../i18n";
import { CookieConsentHost } from "../patterns/CookieConsentPatterns";
import getConfig from "./Config";

const SUPPORTED_LOCALES = new Set(["en", "ro", "he", "ru"]);

function resolveLocale(lng: string): string {
  const base = lng.split("-")[0].toLowerCase();
  return SUPPORTED_LOCALES.has(base) ? base : "en";
}

/**
 * NOTE: if you do not want to use the cookie consent banner, you should
 * run `npm uninstall vanilla-cookieconsent`, and delete this component, its config file,
 * as well as its import in src/client/App.tsx .
 */
const CookieConsentBanner = () => {
  useEffect(() => {
    CookieConsent.run(getConfig(resolveLocale(i18next.language)));

    const handleLanguageChange = (lng: string) => {
      CookieConsent.setLanguage(resolveLocale(lng));
    };

    i18next.on("languageChanged", handleLanguageChange);

    return () => {
      i18next.off("languageChanged", handleLanguageChange);
    };
  }, []);

  return <CookieConsentHost />;
};

export default CookieConsentBanner;
