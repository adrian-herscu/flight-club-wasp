import type { UserRole } from "@prisma/client";

type UserLike = {
  role?: UserRole | null;
};

export function isAdmin(user?: UserLike | null): boolean {
  if (!user) return false;
  return user.role === "SYSTEM_ADMIN" || user.role === "SCHOOL_MANAGER";
}
