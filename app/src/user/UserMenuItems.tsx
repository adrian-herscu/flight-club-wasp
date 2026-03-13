import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { logout } from "wasp/client/auth";
import { Link as WaspRouterLink } from "wasp/client/router";
import { type User } from "wasp/entities";
import { isAdmin } from "../shared/admin";
import { userMenuItems } from "./constants";

export const UserMenuItems = ({
  user,
  onItemClick,
}: {
  user?: Partial<User>;
  onItemClick?: () => void;
}) => {
  const { t } = useTranslation();

  const getItemLabel = (itemName: string) => {
    const labelMap: Record<string, string> = {
      "Account Settings": t("user.accountInformation"),
      "My School": t("admin.mySchool"),
      "Syllabuses": t("admin.syllabuses"),
      "Admin Dashboard": t("admin.dashboard"),
    };
    return labelMap[itemName] || itemName;
  };
  return (
    <>
      {userMenuItems.map((item) => {
        if (item.isAuthRequired && !user) return null;
        if (item.isAdminOnly && !isAdmin(user)) return null;

        return (
          <li key={item.name}>
            <WaspRouterLink
              to={item.to}
              onClick={onItemClick}
              className="text-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium leading-7 transition-colors"
            >
              <item.icon size="1.1rem" />
              {getItemLabel(item.name)}
            </WaspRouterLink>
          </li>
        );
      })}
      <li>
        <button
          onClick={() => {
            logout();
            onItemClick?.();
          }}
          className="text-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium leading-7 transition-colors"
        >
          <LogOut size="1.1rem" />
          {t("auth.logout")}
        </button>
      </li>
    </>
  );
};
