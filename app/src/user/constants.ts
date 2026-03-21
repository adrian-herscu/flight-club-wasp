import type { UserRole } from "@prisma/client";
import { LayoutDashboard, Settings, UserPlus } from "lucide-react";
import { routes } from "wasp/client/router";
import { getDashboardPathForRole } from "../shared/roles";

type AppRouteTo = (typeof routes)[keyof typeof routes]["to"];

export type UserMenuItem = {
  nameKey: string;
  to: AppRouteTo;
  icon: typeof LayoutDashboard;
  isAuthRequired: boolean;
};

/**
 * Returns the user menu items for the given role.
 * The dashboard item is only included when the role has a dashboard.
 * Regular USER accounts have no dashboard entry.
 */
export const getMenuItemsForUser = (role?: UserRole | null): UserMenuItem[] => {
  const items: UserMenuItem[] = [];

  const dashboardPath = getDashboardPathForRole(role);
  if (dashboardPath) {
    items.push({
      nameKey: "user.dashboard",
      to: dashboardPath,
      icon: LayoutDashboard,
      isAuthRequired: true,
    });
  }

  items.push(
    {
      nameKey: "user.requestRoles",
      to: routes.RegistrationRoute.to,
      icon: UserPlus,
      isAuthRequired: true,
    },
    {
      nameKey: "user.accountSettings",
      to: routes.AccountRoute.to,
      icon: Settings,
      isAuthRequired: false,
    },
  );

  return items;
};
