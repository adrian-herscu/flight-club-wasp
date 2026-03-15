import { Settings } from "lucide-react";
// import { LayoutDashboard } from "lucide-react";
import { routes } from "wasp/client/router";

export const userMenuItems = [
  // {
  //   name: "AI Scheduler (Demo App)",
  //   to: routes.DemoAppRoute.to,
  //   icon: LayoutDashboard,
  //   isAdminOnly: false,
  //   isAuthRequired: true,
  // },
  {
    nameKey: "user.accountSettings",
    to: routes.AccountRoute.to,
    icon: Settings,
    isAuthRequired: false,
    isAdminOnly: false,
  },
] as const;
