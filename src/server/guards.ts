// @ts-ignore
import {SchoolRole} from "@prisma/client";
// @ts-ignore
import {HttpError, prisma} from "wasp/server";

export type RequestContext = {
    user?: {
        id: string;
        isSystemAdmin?: boolean | null;
    } | null;
};

export function ensureAuthenticatedUser(context: RequestContext) {
    if (!context.user) {
        throw new HttpError(401, "Only authenticated users can access this resource.");
    }

    return context.user;
}

export function ensureSystemAdmin(context: RequestContext) {
    const user = ensureAuthenticatedUser(context);

    if (!user.isSystemAdmin) {
        throw new HttpError(403, "Only system admins can access this resource.");
    }

    return user;
}

export function getOptionalSchoolIdFromArgs(rawArgs: unknown): string | undefined {
    if (!rawArgs || typeof rawArgs !== "object") {
        return undefined;
    }

    const rawSchoolId = (rawArgs as { schoolId?: unknown }).schoolId;
    if (typeof rawSchoolId !== "string") {
        return undefined;
    }

    const trimmedSchoolId = rawSchoolId.trim();
    return trimmedSchoolId.length > 0 ? trimmedSchoolId : undefined;
}

export async function ensureSchoolManager(context: RequestContext) {
    const user = ensureAuthenticatedUser(context);

    const hasManagerRole = await prisma.userSchoolRole.findFirst({
        where: {
            userId: user.id,
            role: SchoolRole.SCHOOL_MANAGER,
            revokedAt: null,
        },
        select: {id: true},
    });

    if (!hasManagerRole) {
        throw new HttpError(403, "Only school managers can access this resource.");
    }

    return user;
}

export async function getManagedSchoolForUserId(userId: string, schoolId?: string) {
    const school = await prisma.school.findFirst({
        where: {
            adminId: userId,
            ...(schoolId ? {id: schoolId} : {}),
        },
        include: {
            accounts: {
                where: {userId},
                select: {
                    id: true,
                    currency: true,
                    balanceMinor: true,
                    createdAt: true,
                },
            },
        },
        orderBy: [{createdAt: "asc"}],
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

export async function ensureSyllabusOperator(context: RequestContext) {
    const user = ensureAuthenticatedUser(context);

    if (user.isSystemAdmin) {
        return user;
    }

    const hasManagerRole: boolean = await prisma.userSchoolRole.findFirst({
        where: {
            userId: user.id,
            role: SchoolRole.SCHOOL_MANAGER,
            revokedAt: null,
        },
        select: {id: true},
    });

    if (!hasManagerRole) {
        throw new HttpError(403, "Only school managers and system admins can access this resource.");
    }

    return user;
}
