type UserLike = {
  isAdmin?: boolean | null;
  role?: { name?: string | null } | null;
};

export function isAdmin(user?: UserLike | null): boolean {
  if (!user) return false;
  return user.role?.name === "admin" || user.isAdmin === true;
}
