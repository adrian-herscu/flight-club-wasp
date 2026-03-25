import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { logout } from "wasp/client/auth";
import { type User } from "wasp/entities";
import { getMenuItemsForUser } from "./constants";

export const UserMenuItems = ({
  user,
  onItemClick,
}: {
  user?: Partial<User>;
  onItemClick?: () => void;
}) => {
  const { t } = useTranslation();
  const menuItems = getMenuItemsForUser(user ?? null);

  return (
    <>
      {menuItems.map((item) => {
        if (item.isAuthRequired && !user) return null;

        return (
          <li key={item.nameKey}>
            <Link
              to={item.to}
              onClick={onItemClick}
              className="text-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium leading-7 transition-colors"
            >
              <item.icon size="1.1rem" />
              {t(item.nameKey)}
            </Link>
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
