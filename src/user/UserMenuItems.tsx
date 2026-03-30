import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { logout } from "wasp/client/auth";
import { type User } from "wasp/entities";
import {
  MenuListItemButton,
  MenuListItemLink,
} from "../client/components/patterns/MenuItems";
import { getMenuItemsForUser } from "./constants";

export const UserMenuItems = ({
  user,
  onItemClick,
}: {
  user?: Partial<User>;
  onItemClick?: () => void;
}) => {
  const { t } = useTranslation();
  const menuItems = getMenuItemsForUser(user?.role ?? null);

  return (
    <>
      {menuItems.map((item) => {
        if (item.isAuthRequired && !user) return null;

        return (
          <MenuListItemLink key={item.nameKey} to={item.to} onClick={onItemClick}>
              <item.icon size="1.1rem" />
              {t(item.nameKey)}
          </MenuListItemLink>
        );
      })}
      <MenuListItemButton
        onClick={() => {
          logout();
          onItemClick?.();
        }}
      >
          <LogOut size="1.1rem" />
          {t("auth.logout")}
      </MenuListItemButton>
    </>
  );
};
