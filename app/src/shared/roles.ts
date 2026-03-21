import type { UserRole } from "@prisma/client";

export type DashboardPath = "/system-admin" | "/school-manager" | "/instructor" | "/student";

type UserLike = {
  role?: UserRole | null;
};

/**
 * Returns true for all roles that have a dedicated dashboard.
 * Regular USER accounts have no dashboard.
 */
export function hasDashboardAccess(user?: UserLike | null): boolean {
  if (!user) return false;
  return (
    user.role === "SYSTEM_ADMIN" ||
    user.role === "SCHOOL_MANAGER" ||
    user.role === "INSTRUCTOR" ||
    user.role === "STUDENT"
  );
}

export function isSystemAdmin(user?: UserLike | null): boolean {
  if (!user) return false;
  return user.role === "SYSTEM_ADMIN";
}

export function isSchoolManager(user?: UserLike | null): boolean {
  if (!user) return false;
  return user.role === "SCHOOL_MANAGER";
}

/**
 * Returns the root dashboard path for the given role.
 * Returns null for USER (no dashboard).
 */
export function getDashboardPathForRole(role?: UserRole | null): DashboardPath | null {
  switch (role) {
    case "SYSTEM_ADMIN":
      return "/system-admin";
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
