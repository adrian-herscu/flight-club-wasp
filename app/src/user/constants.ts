import { LayoutDashboard, Settings, UserPlus } from "lucide-react";
import { routes } from "wasp/client/router";

export const userMenuItems = [
  {
    nameKey: "user.adminDashboard",
    to: routes.AdminRoute.to,
    icon: LayoutDashboard,
    isAuthRequired: true,
    isAdminOnly: true,
  },
  {
    nameKey: "user.requestRoles",
    to: routes.RegistrationRoute.to,
    icon: UserPlus,
    isAuthRequired: true,
    isAdminOnly: false,
  },
  {
    nameKey: "user.accountSettings",
    to: routes.AccountRoute.to,
    icon: Settings,
    isAuthRequired: false,
    isAdminOnly: false,
  },
] as const;
