import { PrismaClient } from "@prisma/client";
import type { SubscriptionStatus } from "@prisma/client";
import { PaymentPlanId } from "../plans";

export const updateUserLemonSqueezyPaymentDetails = async (
  {
    lemonSqueezyId,
    userId,
    subscriptionPlan,
    subscriptionStatus,
    datePaid,
    numOfCreditsPurchased,
    lemonSqueezyCustomerPortalUrl,
  }: {
    lemonSqueezyId: string;
    userId: string;
    subscriptionPlan?: PaymentPlanId;
    subscriptionStatus?: SubscriptionStatus | null;
    numOfCreditsPurchased?: number;
    lemonSqueezyCustomerPortalUrl?: string;
    datePaid?: Date;
  },
  prismaUserDelegate: PrismaClient["user"],
) => {
  return prismaUserDelegate.update({
    where: {
      id: userId,
    },
    data: {
      paymentProcessorUserId: lemonSqueezyId,
      lemonSqueezyCustomerPortalUrl,
      subscriptionPlan,
      subscriptionStatus: subscriptionStatus || null,
      datePaid,
      credits:
        numOfCreditsPurchased !== undefined
          ? { increment: numOfCreditsPurchased }
          : undefined,
    },
  });
};
