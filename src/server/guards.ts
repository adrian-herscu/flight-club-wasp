// @ts-ignore
import { Prisma, SchoolRole } from "@prisma/client";
// @ts-ignore
import { HttpError, prisma } from "wasp/server";

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

export type RequestContext = {
  user?: {
    id: string;
    isSystemAdmin?: boolean | null;
  } | null;
};

type AuthenticatedUser = NonNullable<RequestContext["user"]>;

type SchoolRoleRecord = { id: string } | null;

type SchoolWithAccounts = Prisma.SchoolGetPayload<{
  include: {
    accounts: {
      select: {
        id: true;
        currency: true;
        balanceMinor: true;
        createdAt: true;
      };
    };
  };
}>;

export type AuthenticatedContext = {
  readonly user: AuthenticatedUser;
};

export type SystemAdminContext = {
  readonly user: AuthenticatedUser;
};

export type SchoolManagerContext = {
  readonly user: AuthenticatedUser;
  readonly school: SchoolWithAccounts;
};

/**
 * school is null for system admins, who operate across all schools.
 */
export type SyllabusOperatorContext = {
  readonly user: AuthenticatedUser;
  readonly school: SchoolWithAccounts | null;
};

// ---------------------------------------------------------------------------
// Low-level guards (use directly only when wrappers don't fit)
// ---------------------------------------------------------------------------

export function ensureAuthenticatedUser(context: RequestContext): AuthenticatedUser {
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users can access this resource.");
  }

  return context.user;
}

export function ensureSystemAdmin(context: RequestContext): AuthenticatedUser {
  const user: AuthenticatedUser = ensureAuthenticatedUser(context);

  if (!user.isSystemAdmin) {
    throw new HttpError(403, "Only system admins can access this resource.");
  }

  return user;
}

export function getOptionalSchoolIdFromArgs(rawArgs: unknown): string | undefined {
  if (!rawArgs || typeof rawArgs !== "object") {
    return undefined;
  }

  const rawSchoolId: unknown = (rawArgs as { schoolId?: unknown }).schoolId;
  if (typeof rawSchoolId !== "string") {
    return undefined;
  }

  const trimmedSchoolId: string = rawSchoolId.trim();
  return trimmedSchoolId.length > 0 ? trimmedSchoolId : undefined;
}

export async function ensureSchoolManager(context: RequestContext): Promise<AuthenticatedUser> {
  const user: AuthenticatedUser = ensureAuthenticatedUser(context);

  const hasManagerRole: SchoolRoleRecord = await prisma.userSchoolRole.findFirst({
    where: {
      userId: user.id,
      role: SchoolRole.SCHOOL_MANAGER,
      revokedAt: null,
    },
    select: { id: true },
  });

  if (!hasManagerRole) {
    throw new HttpError(403, "Only school managers can access this resource.");
  }

  return user;
}

export async function getManagedSchoolForUserId(userId: string, schoolId?: string): Promise<SchoolWithAccounts> {
  const school: SchoolWithAccounts | null = await prisma.school.findFirst({
    where: {
      adminId: userId,
      ...(schoolId ? { id: schoolId } : {}),
    },
    include: {
      accounts: {
        where: { userId },
        select: {
          id: true,
          currency: true,
          balanceMinor: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  if (!school) {
    throw new HttpError(
      403,
      schoolId
        ? "Selected school is not managed by this account."
        : "No managed school is assigned to this account.",
    );
  }

  return school;
}

export async function ensureSyllabusOperator(context: RequestContext): Promise<AuthenticatedUser> {
  const user: AuthenticatedUser = ensureAuthenticatedUser(context);

  if (user.isSystemAdmin) {
    return user;
  }

  const hasManagerRole: SchoolRoleRecord = await prisma.userSchoolRole.findFirst({
    where: {
      userId: user.id,
      role: SchoolRole.SCHOOL_MANAGER,
      revokedAt: null,
    },
    select: { id: true },
  });

  if (!hasManagerRole) {
    throw new HttpError(403, "Only school managers and system admins can access this resource.");
  }

  return user;
}

// ---------------------------------------------------------------------------
// Operation wrappers — preferred API for declaring authorized operations.
//
// Usage:
//   export const myOp = withSchoolManager(async (rawArgs, ctx) => {
//     // ctx.user and ctx.school are guaranteed and typed
//   });
//
// The inner handler never receives the raw RequestContext, making it
// structurally impossible to forget the authorization check.
// ---------------------------------------------------------------------------

export function withAuthenticated<T>(
  handler: (rawArgs: unknown, ctx: AuthenticatedContext) => Promise<T>,
): (rawArgs: unknown, context: RequestContext) => Promise<T> {
  return async (rawArgs: unknown, context: RequestContext): Promise<T> => {
    const user: AuthenticatedUser = ensureAuthenticatedUser(context);
    return handler(rawArgs, { user });
  };
}

export function withSystemAdmin<T>(
  handler: (rawArgs: unknown, ctx: SystemAdminContext) => Promise<T>,
): (rawArgs: unknown, context: RequestContext) => Promise<T> {
  return async (rawArgs: unknown, context: RequestContext): Promise<T> => {
    const user: AuthenticatedUser = ensureSystemAdmin(context);
    return handler(rawArgs, { user });
  };
}

export function withSchoolManager<T>(
  handler: (rawArgs: unknown, ctx: SchoolManagerContext) => Promise<T>,
): (rawArgs: unknown, context: RequestContext) => Promise<T> {
  return async (rawArgs: unknown, context: RequestContext): Promise<T> => {
    const user: AuthenticatedUser = await ensureSchoolManager(context);
    const schoolId: string | undefined = getOptionalSchoolIdFromArgs(rawArgs);
    const school: SchoolWithAccounts = await getManagedSchoolForUserId(user.id, schoolId);
    return handler(rawArgs, { user, school });
  };
}

export function withSyllabusOperator<T>(
  handler: (rawArgs: unknown, ctx: SyllabusOperatorContext) => Promise<T>,
): (rawArgs: unknown, context: RequestContext) => Promise<T> {
  return async (rawArgs: unknown, context: RequestContext): Promise<T> => {
    const user: AuthenticatedUser = await ensureSyllabusOperator(context);
    const schoolId: string | undefined = getOptionalSchoolIdFromArgs(rawArgs);
    const school: SchoolWithAccounts | null = user.isSystemAdmin
      ? null
      : await getManagedSchoolForUserId(user.id, schoolId);
    return handler(rawArgs, { user, school });
  };
}
