import { LayoutDashboard, Settings, UserPlus } from "lucide-react";
import { routes } from "wasp/client/router";
import { getDashboardPathForUser } from "../shared/roles";

type AppRouteTo = (typeof routes)[keyof typeof routes]["to"];

export type UserMenuItem = {
  nameKey: string;
  to: AppRouteTo;
  icon: typeof LayoutDashboard;
  isAuthRequired: boolean;
};

type UserLike = {
  isSystemAdmin?: boolean | null;
};

/**
 * Returns the user menu items for the given user.
 * The dashboard item is only included for system admins.
 * School-role dashboards (/school-manager, /instructor, /student) are
 * accessed directly via the sidebar once inside the dashboard area.
 */
export const getMenuItemsForUser = (user?: UserLike | null): UserMenuItem[] => {
  const items: UserMenuItem[] = [];

  const dashboardPath = getDashboardPathForUser(user);
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
