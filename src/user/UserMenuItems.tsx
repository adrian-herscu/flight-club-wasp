import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { logout } from "wasp/client/auth";
import * as operations from "wasp/client/operations";
import { type User } from "wasp/entities";
import {
  MenuListItemButton,
  MenuListItemLink,
} from "../client/components/patterns/MenuItems";
import { getMenuItemsForUser } from "./constants";

export const UserMenuItems = ({
  user,
  onItemClick,
  includeDashboard = true,
}: {
  user?: Partial<User>;
  onItemClick?: () => void;
  includeDashboard?: boolean;
}) => {
  const { t } = useTranslation();
  const { getMyManagedSchool, useQuery } = operations as any;
  const { data: managedSchoolsData } = useQuery(getMyManagedSchool, undefined, { enabled: Boolean(user) });
  const managedSchools = (managedSchoolsData as Array<{ id: string }> | undefined) ?? [];
  const dashboardPath = user?.isSystemAdmin
    ? "/system-admin"
    : managedSchools.length > 0
      ? "/school-manager"
      : null;
  const menuItems = getMenuItemsForUser(user ?? null, dashboardPath).filter((item) => {
    if (includeDashboard) return true;
    return item.nameKey !== "user.dashboard";
  });

  const handleLogout = async () => {
    onItemClick?.();
    await logout();
    window.location.assign("/");
  };

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
          void handleLogout();
        }}
      >
          <LogOut size="1.1rem" />
          {t("auth.logout")}
      </MenuListItemButton>
    </>
  );
};
