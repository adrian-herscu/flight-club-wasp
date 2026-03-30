import { type Prisma, type SubscriptionStatus, type UserRole } from "@prisma/client";
import { type User } from "wasp/entities";
import { HttpError, prisma } from "wasp/server";
import {
  type GetPaginatedUsers,
  type UpdateIsUserAdminById,
  type UpdateMyUserProfile,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

const updateUserRoleByIdInputSchema = z.object({
  id: z.string().nonempty(),
  role: z.enum(["SYSTEM_ADMIN", "SCHOOL_MANAGER", "INSTRUCTOR", "STUDENT", "USER"]),
});

type UpdateUserRoleByIdInput = z.infer<typeof updateUserRoleByIdInputSchema>;

export const updateIsUserAdminById: UpdateIsUserAdminById<
  UpdateUserRoleByIdInput,
  User
> = async (rawArgs, context) => {
  const { id, role } = ensureArgsSchemaOrThrowHttpError(
    updateUserRoleByIdInputSchema,
    rawArgs,
  );

  if (!context.user) {
    throw new HttpError(
      401,
      "Only authenticated users are allowed to perform this operation",
    );
  }

  if (context.user.role !== "SYSTEM_ADMIN") {
    throw new HttpError(
      403,
      "Only system admins are allowed to perform this operation",
    );
  }

  return context.entities.User.update({
    where: { id },
    data: { role },
  });
};

type GetPaginatedUsersOutput = {
  users: Pick<
    User,
    | "id"
    | "email"
    | "fullName"
    | "role"
    | "subscriptionStatus"
    | "paymentProcessorUserId"
  >[];
  totalPages: number;
};

const getPaginatorArgsSchema = z.object({
  skipPages: z.number(),
  filter: z.object({
    emailContains: z.string().nonempty().optional(),
    roleIn: z
      .array(z.enum(["SYSTEM_ADMIN", "SCHOOL_MANAGER", "INSTRUCTOR", "STUDENT", "USER"]))
      .optional(),
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

  if (context.user.role !== "SYSTEM_ADMIN") {
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
      roleIn,
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
          ...(roleIn && roleIn.length > 0 && {
            role: { in: roleIn as UserRole[] },
          }),
        },
        ...(subscriptionStatusWhere ? [subscriptionStatusWhere] : []),
      ],
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
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
      role: user.role,
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
