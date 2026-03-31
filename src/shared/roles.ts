import type { SchoolRole } from "@prisma/client";

export type DashboardPath = "/system-admin" | "/school-manager" | "/instructor" | "/student";

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
      return "/school-manager";
    case "INSTRUCTOR":
      return "/instructor";
    case "STUDENT":
      return "/student";
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
  if (user.isSystemAdmin) return "/system-admin";
  return null;
}

/**
 * Returns true when the current pathname is inside any role dashboard area.
 */
export function isDashboardPath(pathname: string): boolean {
  return (
    pathname.startsWith("/system-admin") ||
    pathname.startsWith("/school-manager") ||
    pathname.startsWith("/instructor") ||
    pathname.startsWith("/student")
  );
}

/**
 * Infers the dashboard role key from the current pathname.
 * Used by the Sidebar to select the correct navigation items.
 */
export function getRoleKeyFromPath(pathname: string): string | null {
  if (pathname.startsWith("/system-admin")) return "SYSTEM_ADMIN";
  if (pathname.startsWith("/school-manager")) return "SCHOOL_MANAGER";
  if (pathname.startsWith("/instructor")) return "INSTRUCTOR";
  if (pathname.startsWith("/student")) return "STUDENT";
  return null;
}
