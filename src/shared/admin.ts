type UserLike = {
  isSystemAdmin?: boolean | null;
};

/** Returns true when the user has system-admin privileges. */
export function isSystemAdmin(user?: UserLike | null): boolean {
  if (!user) return false;
  return !!user.isSystemAdmin;
}
