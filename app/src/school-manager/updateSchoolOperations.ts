import { Prisma, UserRole } from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

type RequestContext = {
  user?: {
    id: string;
    role?: UserRole | null;
  } | null;
};

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
    throw new HttpError(400, "Website URL must be a valid URL.");
  }

  return normalized;
}

function normalizeOptionalLogoUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = normalizeWebsiteUrl(trimmed);
  const parsed = new URL(normalized);
  if (!parsed.hostname) {
    throw new HttpError(400, "Logo URL must be a valid URL.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new HttpError(400, "Logo URL must use http or https.");
  }

  return normalized;
}

const updateManagedSchoolSchema = z.object({
  name: z.string().trim().min(2),
  websiteUrl: z.string().trim().max(2048).optional(),
  phone: z.string().trim().max(50).optional(),
  logoUrl: z.string().trim().max(2048).optional(),
  addressLine1: z.string().trim().min(2),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(2),
  stateProvince: z.string().trim().optional(),
  postalCode: z.string().trim().min(2),
  defaultHourlyRate: z.number().int().positive().nullable().optional(),
});

type UpdateManagedSchoolInput = z.infer<typeof updateManagedSchoolSchema>;

function ensureSchoolManager(context: RequestContext) {
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users can access manager features.");
  }

  if (context.user.role !== UserRole.SCHOOL_MANAGER) {
    throw new HttpError(403, "Only school managers can access this resource.");
  }

  return context.user;
}

async function getManagedSchoolForUserId(userId: string) {
  const school = await prisma.school.findFirst({
    where: { adminId: userId },
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
  });

  if (!school) {
    throw new HttpError(403, "No managed school is assigned to this account.");
  }

  return school;
}

export const updateMyManagedSchool = async (
  rawArgs: unknown,
  context: RequestContext,
) => {
  const user = ensureSchoolManager(context);
  const school = await getManagedSchoolForUserId(user.id);

  const {
    name,
    websiteUrl,
    phone,
    logoUrl,
    addressLine1,
    addressLine2,
    city,
    stateProvince,
    postalCode,
    defaultHourlyRate,
  } = ensureArgsSchemaOrThrowHttpError(
    updateManagedSchoolSchema,
    rawArgs,
  ) as UpdateManagedSchoolInput;

  const normalizedWebsiteUrl = normalizeOptionalWebsiteUrl(websiteUrl);
  const normalizedLogoUrl = normalizeOptionalLogoUrl(logoUrl);

  try {
    return await prisma.school.update({
      where: { id: school.id },
      data: {
        name,
        websiteUrl: normalizedWebsiteUrl,
        phone: phone?.trim() || null,
        logoUrl: normalizedLogoUrl,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        stateProvince: stateProvince || null,
        postalCode,
        defaultHourlyRate: defaultHourlyRate ?? null,
      },
      include: {
        accounts: {
          where: { userId: user.id },
          select: {
            id: true,
            currency: true,
            balanceMinor: true,
            createdAt: true,
          },
        },
      },
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
