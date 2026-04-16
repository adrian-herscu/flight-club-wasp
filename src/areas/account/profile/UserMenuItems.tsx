import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { logout } from "wasp/client/auth";
import * as operations from "wasp/client/operations";
import { type User } from "wasp/entities";
import { type DashboardPath } from "../../../shared/navigation/dashboardNavigation";
import {
  MenuListItemButton,
  MenuListItemLink,
} from "../../../client/components/patterns/MenuItems";
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
  const { getMyDashboardPath, useQuery } = operations as any;
  const { data: dashboardPathData } = useQuery(getMyDashboardPath, undefined, { enabled: Boolean(user) });
  const dashboardPath = (dashboardPathData as DashboardPath | null | undefined) ?? null;
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
