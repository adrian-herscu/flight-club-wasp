import { SchoolRole, type Prisma, type SubscriptionStatus } from "@prisma/client";
import { type User } from "wasp/entities";
import { HttpError, prisma } from "wasp/server";
import {
  type GetPaginatedUsers,
  type UpdateIsUserAdminById,
  type UpdateMyUserProfile,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../../../server/validation";

const updateUserIsSystemAdminInputSchema = z.object({
  id: z.string().nonempty(),
  isSystemAdmin: z.boolean(),
});

type UpdateUserIsSystemAdminInput = z.infer<typeof updateUserIsSystemAdminInputSchema>;

export const updateIsUserAdminById: UpdateIsUserAdminById<
  UpdateUserIsSystemAdminInput,
  User
> = async (rawArgs, context) => {
  const { id, isSystemAdmin } = ensureArgsSchemaOrThrowHttpError(
    updateUserIsSystemAdminInputSchema,
    rawArgs,
  );

  if (!context.user) {
    throw new HttpError(
      401,
      "Only authenticated users are allowed to perform this operation",
    );
  }

  if (!context.user.isSystemAdmin) {
    throw new HttpError(
      403,
      "Only system admins are allowed to perform this operation",
    );
  }

  return context.entities.User.update({
    where: { id },
    data: { isSystemAdmin },
  });
};

type GetPaginatedUsersOutput = {
  users: Pick<
    User,
    | "id"
    | "email"
    | "fullName"
    | "isSystemAdmin"
    | "subscriptionStatus"
    | "paymentProcessorUserId"
  >[];
  totalPages: number;
};

const getPaginatorArgsSchema = z.object({
  skipPages: z.number(),
  filter: z.object({
    emailContains: z.string().nonempty().optional(),
    isSystemAdmin: z.boolean().optional(),
    subscriptionStatusIn: z
      .array(z.enum(["ACTIVE", "PAST_DUE", "PAUSED", "CANCELLED"]).nullable())
      .optional(),
  }),
});

type GetPaginatedUsersInput = z.infer<typeof getPaginatorArgsSchema>;

export const getPaginatedUsers: GetPaginatedUsers<
  GetPaginatedUsersInput,
  GetPaginatedUsersOutput
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(
      401,
      "Only authenticated users are allowed to perform this operation",
    );
  }

  if (!context.user.isSystemAdmin) {
    throw new HttpError(
      403,
      "Only system admins are allowed to perform this operation",
    );
  }

  const {
    skipPages,
    filter: {
      subscriptionStatusIn: subscriptionStatus,
      emailContains,
      isSystemAdmin,
    },
  } = ensureArgsSchemaOrThrowHttpError(getPaginatorArgsSchema, rawArgs);

  const includeUnsubscribedUsers = !!subscriptionStatus?.some(
    (status) => status === null,
  );
  const desiredSubscriptionStatuses = (subscriptionStatus?.filter(
    (status) => status !== null,
  ) || []) as SubscriptionStatus[];
  const hasSubscriptionFilter = !!subscriptionStatus?.length;

  const pageSize = 10;

  const subscriptionStatusWhere: Prisma.UserWhereInput | undefined =
    hasSubscriptionFilter
      ? {
          OR: [
            ...(desiredSubscriptionStatuses.length > 0
              ? [
                  {
                    subscriptionStatus: {
                      in: desiredSubscriptionStatuses,
                    },
                  },
                ]
              : []),
            ...(includeUnsubscribedUsers
              ? [
                  {
                    subscriptionStatus: null,
                  },
                ]
              : []),
          ],
        }
      : undefined;

  const userPageQuery: Prisma.UserFindManyArgs = {
    skip: skipPages * pageSize,
    take: pageSize,
    where: {
      AND: [
        {
          email: {
            contains: emailContains,
            mode: "insensitive",
          },
          ...(isSystemAdmin !== undefined && { isSystemAdmin }),
        },
        ...(subscriptionStatusWhere ? [subscriptionStatusWhere] : []),
      ],
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      isSystemAdmin: true,
      subscriptionStatus: true,
      paymentProcessorUserId: true,
    },
    orderBy: {
      fullName: "asc",
    },
  };

  const [pageOfUsers, totalUsers] = await prisma.$transaction([
    context.entities.User.findMany(userPageQuery),
    context.entities.User.count({ where: userPageQuery.where }),
  ]);
  const totalPages = Math.ceil(totalUsers / pageSize);

  return {
    users: pageOfUsers.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isSystemAdmin: user.isSystemAdmin,
      subscriptionStatus: user.subscriptionStatus,
      paymentProcessorUserId: user.paymentProcessorUserId,
    })),
    totalPages,
  };
};

const updateMyUserProfileInputSchema = z.object({
  fullName: z.string().min(1).max(255).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
});

type UpdateMyUserProfileInput = z.infer<typeof updateMyUserProfileInputSchema>;

export const updateMyUserProfile: UpdateMyUserProfile<
  UpdateMyUserProfileInput,
  User
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(
      401,
      "Only authenticated users are allowed to perform this operation",
    );
  }

  const { fullName, phone } = ensureArgsSchemaOrThrowHttpError(
    updateMyUserProfileInputSchema,
    rawArgs,
  );

  return context.entities.User.update({
    where: { id: context.user.id },
    data: {
      ...(fullName !== undefined && { fullName }),
      ...(phone !== undefined && { phone }),
    },
  });
};

export const getMyDashboardPath = async (
  _args: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<"/system-admin" | "/school-manager" | "/instructor" | "/student" | null> => {
  if (!context.user) {
    return null;
  }

  if (context.user.isSystemAdmin) {
    return "/system-admin";
  }

  const activeRoles = await prisma.userSchoolRole.findMany({
    where: {
      userId: context.user.id,
      revokedAt: null,
    },
    select: { role: true },
    distinct: ["role"],
  });

  const roles = new Set(activeRoles.map((entry) => entry.role));
  if (roles.has(SchoolRole.SCHOOL_MANAGER)) {
    return "/school-manager";
  }
  if (roles.has(SchoolRole.INSTRUCTOR)) {
    return "/instructor";
  }
  if (roles.has(SchoolRole.STUDENT)) {
    return "/student";
  }

  return null;
};
