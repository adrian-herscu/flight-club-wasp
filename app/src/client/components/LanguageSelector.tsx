import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function LanguageSelector() {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
  };

  return (
    <Select value={i18n.language} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-30">
        <SelectValue placeholder={t("common.language")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">{t("common.english")}</SelectItem>
        <SelectItem value="he">{t("common.hebrew")}</SelectItem>
        <SelectItem value="ro">{t("common.romanian")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
