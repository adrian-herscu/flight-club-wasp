import { GraduationCap, School, Settings, Shield } from "lucide-react";
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
    name: "Account Settings",
    to: routes.AccountRoute.to,
    icon: Settings,
    isAuthRequired: false,
    isAdminOnly: false,
  },
  {
    name: "My School",
    to: routes.ManagerSchoolRoute.to,
    icon: School,
    isAuthRequired: false,
    isAdminOnly: true,
  },
  {
    name: "Syllabuses",
    to: routes.ManagerSyllabusesRoute.to,
    icon: GraduationCap,
    isAuthRequired: false,
    isAdminOnly: true,
  },
  {
    name: "Admin Dashboard",
    to: routes.AdminRoute.to,
    icon: Shield,
    isAuthRequired: false,
    isAdminOnly: true,
  },
] as const;
