import {
  Prisma,
  RegistrationRequestRole,
  RegistrationRequestStatus,
  UserRole,
} from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

type RequestContext = {
  user?: {
    id: string;
    role?: UserRole | null;
  } | null;
};

function ensureAuthenticatedUser(context: RequestContext) {
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users can access this resource.");
  }

  return context.user;
}

function ensureSystemAdmin(context: RequestContext) {
  const user = ensureAuthenticatedUser(context);

  if (user.role !== UserRole.SYSTEM_ADMIN) {
    throw new HttpError(403, "Only system admins can access this resource.");
  }

  return user;
}

async function ensureSchoolManagerAndGetSchool(context: RequestContext) {
  const user = ensureAuthenticatedUser(context);

  if (user.role !== UserRole.SCHOOL_MANAGER) {
    throw new HttpError(403, "Only school managers can access this resource.");
  }

  const school = await prisma.school.findFirst({
    where: { adminId: user.id },
    select: {
      id: true,
      currency: true,
      adminId: true,
    },
  });

  if (!school) {
    throw new HttpError(403, "No managed school is assigned to this account.");
  }

  return { user, school };
}

const submitRegistrationRequestSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required."),
    phone: z.string().trim().min(1, "Phone number is required."),
    requestedRole: z.enum(["SCHOOL_MANAGER", "INSTRUCTOR", "STUDENT"]),
    targetSchoolId: z.string().min(1).optional(),
    requestedSchoolName: z.string().trim().min(2).optional(),
    requestedAddressLine1: z.string().trim().min(2).optional(),
    requestedAddressLine2: z.string().trim().optional(),
    requestedCity: z.string().trim().min(2).optional(),
    requestedStateProvince: z.string().trim().optional(),
    requestedPostalCode: z.string().trim().min(2).optional(),
    requestedCountry: z.string().trim().length(2).optional(),
    requestedCurrency: z.string().trim().length(3).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.requestedRole === "SCHOOL_MANAGER") {
      if (!value.requestedSchoolName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["requestedSchoolName"],
          message: "School name is required.",
        });
      }
      if (!value.requestedAddressLine1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["requestedAddressLine1"],
          message: "School address line 1 is required.",
        });
      }
      if (!value.requestedCity) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["requestedCity"],
          message: "City is required.",
        });
      }
      if (!value.requestedPostalCode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["requestedPostalCode"],
          message: "Postal code is required.",
        });
      }
      if (!value.requestedCountry) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["requestedCountry"],
          message: "Country code is required.",
        });
      }
      if (!value.requestedCurrency) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["requestedCurrency"],
          message: "Currency code is required.",
        });
      }
      return;
    }

    if (!value.targetSchoolId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetSchoolId"],
        message: "You must select a school.",
      });
    }
  });

type SubmitRegistrationRequestInput = z.infer<typeof submitRegistrationRequestSchema>;

function uniqueConstraintTargets(
  error: Prisma.PrismaClientKnownRequestError,
): string[] {
  const { target } = error.meta ?? {};

  if (Array.isArray(target)) {
    return target.map(String);
  }

  if (typeof target === "string") {
    return [target];
  }

  return [];
}

const requestIdSchema = z.object({
  requestId: z.string().min(1),
});

type RequestIdInput = z.infer<typeof requestIdSchema>;

const rejectRequestSchema = z.object({
  requestId: z.string().min(1),
  rejectionReason: z.string().trim().min(1).max(500).optional(),
});

type RejectRequestInput = z.infer<typeof rejectRequestSchema>;

type RegistrationRequestListItem = {
  id: string;
  createdAt: Date;
  requestedRole: RegistrationRequestRole;
  status: RegistrationRequestStatus;
  requester: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
  };
  targetSchool: {
    id: string;
    name: string;
  } | null;
  requestedSchoolName: string | null;
  requestedAddressLine1: string | null;
  requestedAddressLine2: string | null;
  requestedCity: string | null;
  requestedStateProvince: string | null;
  requestedPostalCode: string | null;
  requestedCountry: string | null;
  requestedCurrency: string | null;
};

export const getMyRegistrationRequest = async (
  _args: unknown,
  context: RequestContext,
) => {
  const user = ensureAuthenticatedUser(context);

  return prisma.registrationRequest.findUnique({
    where: { requesterId: user.id },
    include: {
      targetSchool: {
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
        },
      },
      approvedSchool: {
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
        },
      },
    },
  });
};

export const getRegistrationSchoolOptions = async (
  _args: unknown,
  _context: RequestContext,
) => {
  return prisma.school.findMany({
    select: {
      id: true,
      name: true,
      city: true,
      country: true,
    },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
  });
};

export const submitRegistrationRequest = async (
  rawArgs: unknown,
  context: RequestContext,
) => {
  const user = ensureAuthenticatedUser(context);

  if (user.role !== UserRole.USER) {
    throw new HttpError(
      409,
      "Only users with USER role can submit a registration request.",
    );
  }

  const args = ensureArgsSchemaOrThrowHttpError(
    submitRegistrationRequestSchema,
    rawArgs,
  ) as SubmitRegistrationRequestInput;

  if (args.targetSchoolId) {
    const school = await prisma.school.findUnique({
      where: { id: args.targetSchoolId },
      select: { id: true },
    });

    if (!school) {
      throw new HttpError(404, "Selected school was not found.");
    }
  }

  const fullName = args.fullName.trim();
  const phone = args.phone.trim();

  const registrationRequestData = {
    requesterId: user.id,
    requestedRole: args.requestedRole,
    targetSchoolId:
      args.requestedRole === RegistrationRequestRole.SCHOOL_MANAGER
        ? null
        : args.targetSchoolId,
    requestedSchoolName:
      args.requestedRole === RegistrationRequestRole.SCHOOL_MANAGER
        ? args.requestedSchoolName?.trim() ?? null
        : null,
    requestedAddressLine1:
      args.requestedRole === RegistrationRequestRole.SCHOOL_MANAGER
        ? args.requestedAddressLine1?.trim() ?? null
        : null,
    requestedAddressLine2:
      args.requestedRole === RegistrationRequestRole.SCHOOL_MANAGER
        ? args.requestedAddressLine2?.trim() ?? null
        : null,
    requestedCity:
      args.requestedRole === RegistrationRequestRole.SCHOOL_MANAGER
        ? args.requestedCity?.trim() ?? null
        : null,
    requestedStateProvince:
      args.requestedRole === RegistrationRequestRole.SCHOOL_MANAGER
        ? args.requestedStateProvince?.trim() ?? null
        : null,
    requestedPostalCode:
      args.requestedRole === RegistrationRequestRole.SCHOOL_MANAGER
        ? args.requestedPostalCode?.trim() ?? null
        : null,
    requestedCountry:
      args.requestedRole === RegistrationRequestRole.SCHOOL_MANAGER
        ? args.requestedCountry?.trim().toUpperCase() ?? null
        : null,
    requestedCurrency:
      args.requestedRole === RegistrationRequestRole.SCHOOL_MANAGER
        ? args.requestedCurrency?.trim().toUpperCase() ?? null
        : null,
  } satisfies Prisma.RegistrationRequestUncheckedCreateInput;

  try {
    const [, registrationRequest] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          fullName,
          phone,
        },
      }),
      prisma.registrationRequest.create({
        data: registrationRequestData,
      }),
    ]);

    return registrationRequest;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const targets = uniqueConstraintTargets(error);
      const isRequesterDuplicate = targets.some(
        (target) =>
          target === "requesterId" ||
          target.includes("requesterId") ||
          target.includes("RegistrationRequest_requesterId"),
      );

      if (isRequesterDuplicate) {
        throw new HttpError(409, "You already submitted a registration request.");
      }

      throw new HttpError(
        409,
        "A value you entered is already in use. Please review your details and try again.",
      );
    }

    throw error;
  }
};

export const getPendingSchoolManagerRequests = async (
  _args: unknown,
  context: RequestContext,
): Promise<RegistrationRequestListItem[]> => {
  ensureSystemAdmin(context);

  return prisma.registrationRequest.findMany({
    where: {
      requestedRole: RegistrationRequestRole.SCHOOL_MANAGER,
      status: RegistrationRequestStatus.PENDING,
    },
    include: {
      requester: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
      targetSchool: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

export const getPendingSchoolMemberRequests = async (
  _args: unknown,
  context: RequestContext,
): Promise<RegistrationRequestListItem[]> => {
  const { school } = await ensureSchoolManagerAndGetSchool(context);

  return prisma.registrationRequest.findMany({
    where: {
      targetSchoolId: school.id,
      requestedRole: {
        in: [RegistrationRequestRole.INSTRUCTOR, RegistrationRequestRole.STUDENT],
      },
      status: RegistrationRequestStatus.PENDING,
    },
    include: {
      requester: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
      targetSchool: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

export const approveSchoolManagerRequest = async (
  rawArgs: unknown,
  context: RequestContext,
) => {
  const reviewer = ensureSystemAdmin(context);
  const { requestId } = ensureArgsSchemaOrThrowHttpError(
    requestIdSchema,
    rawArgs,
  ) as RequestIdInput;

  const request = await prisma.registrationRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new HttpError(404, "Registration request not found.");
  }

  if (request.status !== RegistrationRequestStatus.PENDING) {
    throw new HttpError(409, "Only pending requests can be approved.");
  }

  if (request.requestedRole !== RegistrationRequestRole.SCHOOL_MANAGER) {
    throw new HttpError(400, "This request is not a school manager request.");
  }

  if (
    !request.requestedSchoolName ||
    !request.requestedAddressLine1 ||
    !request.requestedCity ||
    !request.requestedPostalCode ||
    !request.requestedCountry ||
    !request.requestedCurrency
  ) {
    throw new HttpError(400, "School details are incomplete for this request.");
  }

  const requestedSchoolName = request.requestedSchoolName!;
  const requestedAddressLine1 = request.requestedAddressLine1!;
  const requestedCity = request.requestedCity!;
  const requestedPostalCode = request.requestedPostalCode!;
  const requestedCountry = request.requestedCountry!;
  const requestedCurrency = request.requestedCurrency!;

  try {
    return await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: requestedSchoolName,
          addressLine1: requestedAddressLine1,
          addressLine2: request.requestedAddressLine2,
          city: requestedCity,
          stateProvince: request.requestedStateProvince,
          postalCode: requestedPostalCode,
          country: requestedCountry,
          currency: requestedCurrency,
          adminId: request.requesterId,
        },
      });

      const existingAccount = await tx.account.findFirst({
        where: {
          userId: request.requesterId,
          schoolId: school.id,
        },
        select: { id: true },
      });

      if (!existingAccount) {
        await tx.account.create({
          data: {
            userId: request.requesterId,
            schoolId: school.id,
            currency: school.currency,
          },
        });
      }

      await tx.user.update({
        where: { id: request.requesterId },
        data: { role: UserRole.SCHOOL_MANAGER },
      });

      await tx.registrationRequest.update({
        where: { id: request.id },
        data: {
          status: RegistrationRequestStatus.APPROVED,
          reviewerId: reviewer.id,
          reviewedAt: new Date(),
          approvedSchoolId: school.id,
        },
      });

      return {
        requestId: request.id,
        approvedSchoolId: school.id,
      };
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(
        409,
        "A school with the same name and country already exists.",
      );
    }

    throw error;
  }
};

export const rejectSchoolManagerRequest = async (
  rawArgs: unknown,
  context: RequestContext,
) => {
  const reviewer = ensureSystemAdmin(context);
  const { requestId, rejectionReason } = ensureArgsSchemaOrThrowHttpError(
    rejectRequestSchema,
    rawArgs,
  ) as RejectRequestInput;

  const request = await prisma.registrationRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      status: true,
      requestedRole: true,
    },
  });

  if (!request) {
    throw new HttpError(404, "Registration request not found.");
  }

  if (request.status !== RegistrationRequestStatus.PENDING) {
    throw new HttpError(409, "Only pending requests can be rejected.");
  }

  if (request.requestedRole !== RegistrationRequestRole.SCHOOL_MANAGER) {
    throw new HttpError(400, "This request is not a school manager request.");
  }

  return prisma.registrationRequest.update({
    where: { id: request.id },
    data: {
      status: RegistrationRequestStatus.REJECTED,
      reviewerId: reviewer.id,
      reviewedAt: new Date(),
      rejectionReason: rejectionReason?.trim() || null,
    },
  });
};

export const approveSchoolMemberRequest = async (
  rawArgs: unknown,
  context: RequestContext,
) => {
  const { user: reviewer, school } = await ensureSchoolManagerAndGetSchool(context);
  const { requestId } = ensureArgsSchemaOrThrowHttpError(
    requestIdSchema,
    rawArgs,
  ) as RequestIdInput;

  const request = await prisma.registrationRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      requesterId: true,
      requestedRole: true,
      targetSchoolId: true,
      status: true,
    },
  });

  if (!request) {
    throw new HttpError(404, "Registration request not found.");
  }

  if (request.status !== RegistrationRequestStatus.PENDING) {
    throw new HttpError(409, "Only pending requests can be approved.");
  }

  if (
    request.requestedRole !== RegistrationRequestRole.INSTRUCTOR &&
    request.requestedRole !== RegistrationRequestRole.STUDENT
  ) {
    throw new HttpError(400, "Only instructor/student requests can be approved here.");
  }

  if (!request.targetSchoolId || request.targetSchoolId !== school.id) {
    throw new HttpError(403, "You can approve only requests for your own school.");
  }

  return prisma.$transaction(async (tx) => {
    if (request.requestedRole === RegistrationRequestRole.INSTRUCTOR) {
      const instructor = await tx.instructor.findUnique({
        where: { userId: request.requesterId },
        select: { id: true },
      });

      if (!instructor) {
        await tx.instructor.create({
          data: {
            userId: request.requesterId,
          },
        });
      }
    } else {
      const student = await tx.student.findUnique({
        where: { userId: request.requesterId },
        select: { id: true },
      });

      if (!student) {
        await tx.student.create({
          data: {
            userId: request.requesterId,
          },
        });
      }
    }

    const account = await tx.account.findFirst({
      where: {
        userId: request.requesterId,
        schoolId: school.id,
      },
      select: { id: true },
    });

    if (!account) {
      await tx.account.create({
        data: {
          userId: request.requesterId,
          schoolId: school.id,
          currency: school.currency,
        },
      });
    }

    await tx.user.update({
      where: { id: request.requesterId },
      data: {
        role:
          request.requestedRole === RegistrationRequestRole.INSTRUCTOR
            ? UserRole.INSTRUCTOR
            : UserRole.STUDENT,
      },
    });

    await tx.registrationRequest.update({
      where: { id: request.id },
      data: {
        status: RegistrationRequestStatus.APPROVED,
        reviewerId: reviewer.id,
        reviewedAt: new Date(),
      },
    });

    return {
      requestId: request.id,
      approvedRole: request.requestedRole,
    };
  });
};

export const rejectSchoolMemberRequest = async (
  rawArgs: unknown,
  context: RequestContext,
) => {
  const { user: reviewer, school } = await ensureSchoolManagerAndGetSchool(context);
  const { requestId, rejectionReason } = ensureArgsSchemaOrThrowHttpError(
    rejectRequestSchema,
    rawArgs,
  ) as RejectRequestInput;

  const request = await prisma.registrationRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      targetSchoolId: true,
      status: true,
      requestedRole: true,
    },
  });

  if (!request) {
    throw new HttpError(404, "Registration request not found.");
  }

  if (request.status !== RegistrationRequestStatus.PENDING) {
    throw new HttpError(409, "Only pending requests can be rejected.");
  }

  if (
    request.requestedRole !== RegistrationRequestRole.INSTRUCTOR &&
    request.requestedRole !== RegistrationRequestRole.STUDENT
  ) {
    throw new HttpError(400, "Only instructor/student requests can be rejected here.");
  }

  if (!request.targetSchoolId || request.targetSchoolId !== school.id) {
    throw new HttpError(403, "You can reject only requests for your own school.");
  }

  return prisma.registrationRequest.update({
    where: { id: request.id },
    data: {
      status: RegistrationRequestStatus.REJECTED,
      reviewerId: reviewer.id,
      reviewedAt: new Date(),
      rejectionReason: rejectionReason?.trim() || null,
    },
  });
};
