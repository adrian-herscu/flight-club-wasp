import type { SchoolRole } from "@prisma/client";
import {
  DASHBOARD_ROOT_PATH_BY_ROLE,
  getDashboardRoleFromPath,
  getDashboardPathForRole,
  isDashboardRoutePath,
  type DashboardPath,
  type DashboardRoleKey,
} from "./navigation/dashboardNavigation";

export type { DashboardPath, DashboardRoleKey };

type UserLike = {
  isSystemAdmin?: boolean | null;
};

/**
 * Returns true for users that have a dedicated system-admin dashboard.
 * School-role dashboards (/school-manager, /instructor, /student) are
 * accessible to any authenticated user on those routes; the server-side
 * operations enforce the actual role requirements.
 */
export function hasDashboardAccess(user?: UserLike | null): boolean {
  if (!user) return false;
  return !!user.isSystemAdmin;
}

export function isSystemAdmin(user?: UserLike | null): boolean {
  if (!user) return false;
  return !!user.isSystemAdmin;
}

/**
 * Returns the root dashboard path for the given SchoolRole.
 * Returns null for roles without a dedicated dashboard.
 */
export function getDashboardPathForSchoolRole(role?: SchoolRole | null): DashboardPath | null {
  switch (role) {
    case "SCHOOL_MANAGER":
      return getDashboardPathForRole("SCHOOL_MANAGER");
    case "INSTRUCTOR":
      return getDashboardPathForRole("INSTRUCTOR");
    case "STUDENT":
      return getDashboardPathForRole("STUDENT");
    default:
      return null;
  }
}

/**
 * Returns the system-admin dashboard path for system administrators,
 * or null for non-admins.
 */
export function getDashboardPathForUser(user?: UserLike | null): DashboardPath | null {
  if (!user) return null;
  if (user.isSystemAdmin) return DASHBOARD_ROOT_PATH_BY_ROLE.SYSTEM_ADMIN;
  return null;
}

/**
 * Returns true when the current pathname is inside any role dashboard area.
 */
export function isDashboardPath(pathname: string): boolean {
  return isDashboardRoutePath(pathname);
}

/**
 * Infers the dashboard role key from the current pathname.
 * Used by the Sidebar to select the correct navigation items.
 */
export function getRoleKeyFromPath(pathname: string): DashboardRoleKey | null {
  return getDashboardRoleFromPath(pathname);
}
