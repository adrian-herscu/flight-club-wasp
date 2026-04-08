import {
  Prisma,
  RegistrationRequestRole,
  RegistrationRequestDecisionType,
  RegistrationRequestStatus,
  SchoolRole,
} from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import {
  type RequestContext,
  withAuthenticated,
  withSystemAdmin,
  withSchoolManager,
} from "../server/guards";

function schoolRequestRoleToSchoolRole(role: RegistrationRequestRole): SchoolRole {
  switch (role) {
    case RegistrationRequestRole.SCHOOL_MANAGER:
      return SchoolRole.SCHOOL_MANAGER;
    case RegistrationRequestRole.INSTRUCTOR:
      return SchoolRole.INSTRUCTOR;
    case RegistrationRequestRole.STUDENT:
      return SchoolRole.STUDENT;
  }
}

function normalizeWebsiteUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed);
  return hasScheme ? trimmed : `https://${trimmed}`;
}

function normalizeOptionalWebsiteUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = normalizeWebsiteUrl(trimmed);
  const parsed = new URL(normalized);
  if (!parsed.hostname) {
    throw new Error("Invalid website URL.");
  }

  return normalized;
}

function isValidOptionalWebsiteUrl(value: string | undefined): boolean {
  if (!value?.trim()) {
    return true;
  }

  try {
    normalizeOptionalWebsiteUrl(value);
    return true;
  } catch {
    return false;
  }
}

function normalizeOptionalLogoUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = normalizeWebsiteUrl(trimmed);
  const parsed = new URL(normalized);
  if (!parsed.hostname) {
    throw new Error("Invalid logo URL.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Logo URL must use http or https.");
  }

  return normalized;
}

function isValidOptionalLogoUrl(value: string | undefined): boolean {
  if (!value?.trim()) {
    return true;
  }

  try {
    normalizeOptionalLogoUrl(value);
    return true;
  } catch {
    return false;
  }
}


const submitRegistrationRequestSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required."),
    phone: z.string().trim().min(1, "Phone number is required."),
    requestedRole: z.enum(["SCHOOL_MANAGER", "INSTRUCTOR", "STUDENT"]),
    targetSchoolId: z.string().min(1).optional(),
    requestedSchoolName: z.string().trim().min(2).optional(),
    requestedWebsiteUrl: z.string().trim().max(2048).optional(),
    requestedPhone: z.string().trim().max(50).optional(),
    requestedLogoUrl: z.string().trim().max(2048).optional(),
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
      if (!isValidOptionalWebsiteUrl(value.requestedWebsiteUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["requestedWebsiteUrl"],
          message: "Website URL must be a valid URL.",
        });
      }
      if (!isValidOptionalLogoUrl(value.requestedLogoUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["requestedLogoUrl"],
          message: "Logo URL must be a valid http/https URL.",
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
  requestedWebsiteUrl: string | null;
  requestedPhone: string | null;
  requestedLogoUrl: string | null;
  requestedAddressLine1: string | null;
  requestedAddressLine2: string | null;
  requestedCity: string | null;
  requestedStateProvince: string | null;
  requestedPostalCode: string | null;
  requestedCountry: string | null;
  requestedCurrency: string | null;
  rejectionReason?: string | null;
  approvedSchool?: {
    id: string;
    name: string;
    websiteUrl: string | null;
    phone: string | null;
    logoUrl: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    stateProvince: string | null;
    postalCode: string;
    country: string;
    currency: string;
  } | null;
};

export const getMyRegistrationRequests = withAuthenticated(async (_args, ctx) => {
  return prisma.registrationRequest.findMany({
    where: { requesterId: ctx.user.id },
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
      decisions: {
        select: {
          id: true,
          createdAt: true,
          decisionType: true,
          reason: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
});

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
      websiteUrl: true,
      phone: true,
      logoUrl: true,
    },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
  });
};

export const submitRegistrationRequest = withAuthenticated(async (rawArgs, ctx) => {
  const user = ctx.user;

  const args = ensureArgsSchemaOrThrowHttpError(
    submitRegistrationRequestSchema,
    rawArgs,
  ) as SubmitRegistrationRequestInput;

  if (args.requestedRole === "STUDENT") {
    throw new HttpError(
      400,
      "Student membership is granted through the course-interest flow, not direct registration.",
    );
  }

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
  const normalizedRequestedRole = args.requestedRole as RegistrationRequestRole;
  const requestedWebsiteUrl =
    normalizedRequestedRole === RegistrationRequestRole.SCHOOL_MANAGER
      ? normalizeOptionalWebsiteUrl(args.requestedWebsiteUrl)
      : null;

  const requestedSchoolName =
    normalizedRequestedRole === RegistrationRequestRole.SCHOOL_MANAGER
      ? args.requestedSchoolName?.trim() ?? null
      : null;
  const requestedCountry =
    normalizedRequestedRole === RegistrationRequestRole.SCHOOL_MANAGER
      ? args.requestedCountry?.trim().toUpperCase() ?? null
      : null;

  const requestedPhone =
    normalizedRequestedRole === RegistrationRequestRole.SCHOOL_MANAGER
      ? args.requestedPhone?.trim() ?? null
      : null;

  const requestedLogoUrl =
    normalizedRequestedRole === RegistrationRequestRole.SCHOOL_MANAGER
      ? normalizeOptionalLogoUrl(args.requestedLogoUrl)
      : null;

  if (normalizedRequestedRole !== RegistrationRequestRole.SCHOOL_MANAGER) {
    const existingRole = await prisma.userSchoolRole.findUnique({
      where: {
        userId_schoolId_role: {
          userId: user.id,
          schoolId: args.targetSchoolId!,
          role: schoolRequestRoleToSchoolRole(normalizedRequestedRole),
        },
      },
      select: { id: true },
    });

    if (existingRole) {
      throw new HttpError(409, "You already hold this role for the selected school.");
    }
  }

  const duplicatePendingRequest = await prisma.registrationRequest.findFirst({
    where:
      normalizedRequestedRole === RegistrationRequestRole.SCHOOL_MANAGER
        ? {
            requesterId: user.id,
            requestedRole: normalizedRequestedRole,
            status: RegistrationRequestStatus.PENDING,
            requestedSchoolName: requestedSchoolName,
            requestedCountry: requestedCountry,
          }
        : {
            requesterId: user.id,
            requestedRole: normalizedRequestedRole,
            targetSchoolId: args.targetSchoolId,
            status: RegistrationRequestStatus.PENDING,
          },
    select: { id: true },
  });

  if (duplicatePendingRequest) {
    throw new HttpError(409, "You already have a pending request for this role.");
  }

  const registrationRequestData = {
    requesterId: user.id,
    requestedRole: normalizedRequestedRole,
    targetSchoolId:
      normalizedRequestedRole === RegistrationRequestRole.SCHOOL_MANAGER
        ? null
        : args.targetSchoolId,
    requestedSchoolName,
    requestedWebsiteUrl,
    requestedAddressLine1:
      normalizedRequestedRole === RegistrationRequestRole.SCHOOL_MANAGER
        ? args.requestedAddressLine1?.trim() ?? null
        : null,
    requestedAddressLine2:
      normalizedRequestedRole === RegistrationRequestRole.SCHOOL_MANAGER
        ? args.requestedAddressLine2?.trim() ?? null
        : null,
    requestedCity:
      normalizedRequestedRole === RegistrationRequestRole.SCHOOL_MANAGER
        ? args.requestedCity?.trim() ?? null
        : null,
    requestedStateProvince:
      normalizedRequestedRole === RegistrationRequestRole.SCHOOL_MANAGER
        ? args.requestedStateProvince?.trim() ?? null
        : null,
    requestedPostalCode:
      normalizedRequestedRole === RegistrationRequestRole.SCHOOL_MANAGER
        ? args.requestedPostalCode?.trim() ?? null
        : null,
    requestedCountry,
    requestedCurrency:
      normalizedRequestedRole === RegistrationRequestRole.SCHOOL_MANAGER
        ? args.requestedCurrency?.trim().toUpperCase() ?? null
        : null,
    requestedPhone,
    requestedLogoUrl,
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

      if (isRequesterDuplicate || targets.some((target) => target.includes("pending_role_request"))) {
        throw new HttpError(409, "You already have a pending request for this role.");
      }

      throw new HttpError(
        409,
        "A value you entered is already in use. Please review your details and try again.",
      );
    }

    throw error;
  }
});

export const getPendingSchoolManagerRequests = withSystemAdmin(
  async (_args, _ctx): Promise<RegistrationRequestListItem[]> => {
    return prisma.registrationRequest.findMany({
    where: {
      requestedRole: RegistrationRequestRole.SCHOOL_MANAGER,
      status: {
        in: [RegistrationRequestStatus.PENDING, RegistrationRequestStatus.APPROVED],
      },
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
      approvedSchool: {
        select: {
          id: true,
          name: true,
          websiteUrl: true,
          phone: true,
          logoUrl: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          stateProvince: true,
          postalCode: true,
          country: true,
          currency: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
},
);

export const getPendingSchoolMemberRequests = withSchoolManager(
  async (rawArgs, ctx): Promise<RegistrationRequestListItem[]> => {
    return prisma.registrationRequest.findMany({
      where: {
        targetSchoolId: ctx.school.id,
        requestedRole: {
          in: [RegistrationRequestRole.INSTRUCTOR, RegistrationRequestRole.STUDENT],
        },
        status: {
          in: [RegistrationRequestStatus.PENDING, RegistrationRequestStatus.APPROVED],
        },
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
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
  },
);

export const approveSchoolManagerRequest = withSystemAdmin(async (rawArgs, ctx) => {
  const reviewer = ctx.user;
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

  if (request.requesterId === reviewer.id) {
    throw new HttpError(403, "You cannot approve your own registration request.");
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
          websiteUrl: request.requestedWebsiteUrl,
          phone: request.requestedPhone ?? null,
          logoUrl: request.requestedLogoUrl ?? null,
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

      await tx.userSchoolRole.upsert({
        where: {
          userId_schoolId_role: {
            userId: request.requesterId,
            schoolId: school.id,
            role: SchoolRole.SCHOOL_MANAGER,
          },
        },
        update: {
          revokedAt: null,
          grantedByUserId: reviewer.id,
          sourceRegistrationRequestId: request.id,
        },
        create: {
          userId: request.requesterId,
          schoolId: school.id,
          role: SchoolRole.SCHOOL_MANAGER,
          grantedByUserId: reviewer.id,
          sourceRegistrationRequestId: request.id,
        },
      });

      await tx.registrationRequestDecision.create({
        data: {
          requestId: request.id,
          decisionType: RegistrationRequestDecisionType.APPROVED,
          reviewerId: reviewer.id,
          approvedSchoolId: school.id,
        },
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
});

export const rejectSchoolManagerRequest = withSystemAdmin(async (rawArgs, ctx) => {
  const reviewer = ctx.user;
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

  const fullRequest = await prisma.registrationRequest.findUnique({
    where: { id: request.id },
    select: { requesterId: true },
  });

  if (fullRequest?.requesterId === reviewer.id) {
    throw new HttpError(403, "You cannot reject your own registration request.");
  }

  if (request.requestedRole !== RegistrationRequestRole.SCHOOL_MANAGER) {
    throw new HttpError(400, "This request is not a school manager request.");
  }

  return prisma.$transaction(async (tx) => {
    await tx.registrationRequestDecision.create({
      data: {
        requestId: request.id,
        decisionType: RegistrationRequestDecisionType.REJECTED,
        reviewerId: reviewer.id,
        reason: rejectionReason?.trim() || null,
      },
    });

    return tx.registrationRequest.update({
      where: { id: request.id },
      data: {
        status: RegistrationRequestStatus.REJECTED,
        reviewerId: reviewer.id,
        reviewedAt: new Date(),
        rejectionReason: rejectionReason?.trim() || null,
      },
    });
  });
});

export const approveSchoolMemberRequest = withSchoolManager(async (rawArgs, ctx) => {
  const reviewer = ctx.user;
  const school = ctx.school;
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

  if (request.requesterId === reviewer.id) {
    throw new HttpError(403, "You cannot approve your own registration request.");
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

    await tx.userSchoolRole.upsert({
      where: {
        userId_schoolId_role: {
          userId: request.requesterId,
          schoolId: school.id,
          role: schoolRequestRoleToSchoolRole(request.requestedRole),
        },
      },
      update: {
        revokedAt: null,
        grantedByUserId: reviewer.id,
        sourceRegistrationRequestId: request.id,
      },
      create: {
        userId: request.requesterId,
        schoolId: school.id,
        role: schoolRequestRoleToSchoolRole(request.requestedRole),
        grantedByUserId: reviewer.id,
        sourceRegistrationRequestId: request.id,
      },
    });

    await tx.registrationRequestDecision.create({
      data: {
        requestId: request.id,
        decisionType: RegistrationRequestDecisionType.APPROVED,
        reviewerId: reviewer.id,
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
});

export const rejectSchoolMemberRequest = withSchoolManager(async (rawArgs, ctx) => {
  const reviewer = ctx.user;
  const school = ctx.school;
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

  const fullRequest = await prisma.registrationRequest.findUnique({
    where: { id: request.id },
    select: { requesterId: true },
  });

  if (fullRequest?.requesterId === reviewer.id) {
    throw new HttpError(403, "You cannot reject your own registration request.");
  }

  return prisma.$transaction(async (tx) => {
    await tx.registrationRequestDecision.create({
      data: {
        requestId: request.id,
        decisionType: RegistrationRequestDecisionType.REJECTED,
        reviewerId: reviewer.id,
        reason: rejectionReason?.trim() || null,
      },
    });

    return tx.registrationRequest.update({
      where: { id: request.id },
      data: {
        status: RegistrationRequestStatus.REJECTED,
        reviewerId: reviewer.id,
        reviewedAt: new Date(),
        rejectionReason: rejectionReason?.trim() || null,
      },
    });
  });
});
