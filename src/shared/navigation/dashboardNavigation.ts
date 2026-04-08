export type DashboardPath = "/system-admin" | "/school-manager" | "/instructor" | "/student";

export type DashboardRoleKey = "SYSTEM_ADMIN" | "SCHOOL_MANAGER" | "INSTRUCTOR" | "STUDENT";

export type DashboardNavIconKey =
  | "dashboard"
  | "users"
  | "schools"
  | "courses"
  | "syllabuses"
  | "instructorRequests"
  | "studentRequests";

export type DashboardNavItem = {
  nameKey: string;
  to: string;
  iconKey: DashboardNavIconKey;
  matchPrefix?: string;
};

export const DASHBOARD_ROOT_PATH_BY_ROLE: Record<DashboardRoleKey, DashboardPath> = {
  SYSTEM_ADMIN: "/system-admin",
  SCHOOL_MANAGER: "/school-manager",
  INSTRUCTOR: "/instructor",
  STUDENT: "/student",
};

export const DASHBOARD_NAV_ITEMS_BY_ROLE: Record<DashboardRoleKey, readonly DashboardNavItem[]> = {
  SYSTEM_ADMIN: [
    { nameKey: "admin.dashboard", to: "/system-admin", iconKey: "dashboard" },
    { nameKey: "admin.users", to: "/system-admin/users", iconKey: "users" },
    { nameKey: "admin.schools", to: "/system-admin/school-requests", iconKey: "schools" },
    {
      nameKey: "admin.syllabuses",
      to: "/system-admin/syllabuses?section=catalog",
      iconKey: "syllabuses",
      matchPrefix: "/system-admin/syllabuses",
    },
  ],
  SCHOOL_MANAGER: [
    { nameKey: "admin.dashboard", to: "/school-manager", iconKey: "dashboard" },
    {
      nameKey: "admin.filterInstructors",
      to: "/school-manager/member-requests/instructors",
      iconKey: "instructorRequests",
    },
    {
      nameKey: "admin.filterStudents",
      to: "/school-manager/member-requests/students",
      iconKey: "studentRequests",
    },
    { nameKey: "admin.schools", to: "/school-manager/school", iconKey: "schools" },
    {
      nameKey: "admin.courses",
      to: "/school-manager/courses",
      iconKey: "courses",
      matchPrefix: "/school-manager/courses",
    },
    {
      nameKey: "admin.syllabuses",
      to: "/school-manager/syllabuses?section=catalog",
      iconKey: "syllabuses",
      matchPrefix: "/school-manager/syllabuses",
    },
  ],
  INSTRUCTOR: [
    { nameKey: "admin.dashboard", to: "/instructor", iconKey: "dashboard" },
    {
      nameKey: "admin.courses",
      to: "/instructor/courses",
      iconKey: "courses",
      matchPrefix: "/instructor/courses",
    },
  ],
  STUDENT: [{ nameKey: "admin.dashboard", to: "/student", iconKey: "dashboard" }],
};

export function getDashboardPathForRole(role?: DashboardRoleKey | null): DashboardPath | null {
  if (!role) {
    return null;
  }
  return DASHBOARD_ROOT_PATH_BY_ROLE[role] ?? null;
}

export function getDashboardRoleFromPath(pathname: string): DashboardRoleKey | null {
  if (pathname.startsWith(DASHBOARD_ROOT_PATH_BY_ROLE.SYSTEM_ADMIN)) return "SYSTEM_ADMIN";
  if (pathname.startsWith(DASHBOARD_ROOT_PATH_BY_ROLE.SCHOOL_MANAGER)) return "SCHOOL_MANAGER";
  if (pathname.startsWith(DASHBOARD_ROOT_PATH_BY_ROLE.INSTRUCTOR)) return "INSTRUCTOR";
  if (pathname.startsWith(DASHBOARD_ROOT_PATH_BY_ROLE.STUDENT)) return "STUDENT";
  return null;
}

export function isDashboardRoutePath(pathname: string): boolean {
  return getDashboardRoleFromPath(pathname) !== null;
}
