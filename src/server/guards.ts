// @ts-ignore
import { Prisma, SchoolRole } from "@prisma/client";
// @ts-ignore
import { HttpError, prisma } from "wasp/server";

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
