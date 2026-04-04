import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "./ui/select";
import { LanguageSelectorTrigger } from "./patterns/LanguageSelectorPatterns";

export function LanguageSelector() {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
  };

  return (
    <Select value={i18n.language} onValueChange={handleLanguageChange}>
      <LanguageSelectorTrigger>
        <SelectValue placeholder={t("common.language")} />
      </LanguageSelectorTrigger>
      <SelectContent>
        <SelectItem value="en">{t("common.english")}</SelectItem>
        <SelectItem value="he">{t("common.hebrew")}</SelectItem>
        <SelectItem value="ro">{t("common.romanian")}</SelectItem>
        <SelectItem value="ru">Русский</SelectItem>
      </SelectContent>
    </Select>
  );
}
