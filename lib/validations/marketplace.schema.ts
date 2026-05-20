import { z } from "zod";
import { MARKETPLACE_SHIPPING_METHODS } from "@/lib/utils/marketplaceShipping";

const cardBrandSchema = z.enum(["visa", "mastercard", "amex", "unknown"]);

export const marketplaceCardPaymentSchema = z.object({
  cardholderName: z.string().trim().min(2).max(100),
  cardLast4: z.string().regex(/^\d{4}$/),
  cardBrand: cardBrandSchema,
  expMonth: z.string().regex(/^(0[1-9]|1[0-2])$/),
  expYear: z.string().regex(/^\d{2}$/),
});

export const marketplaceGcashPaymentSchema = z.object({
  accountName: z.string().trim().min(2).max(100),
  mobileNumber: z.string().min(10).max(20),
});

export const marketplaceBankTransferPaymentSchema = z.object({
  depositorName: z.string().trim().min(2).max(100).optional(),
  depositorBank: z.string().trim().min(2).max(80).optional(),
  accountLast4: z.string().regex(/^\d{4}$/).optional(),
  transferReference: z.string().trim().min(4).max(64),
  depositToBankId: z.string().min(1).max(32),
});

export const marketplaceCodPaymentSchema = z.object({
  codAcknowledged: z.literal(true),
  prepareChangeFor: z.number().min(0).optional(),
});

const shippingMethodIds = MARKETPLACE_SHIPPING_METHODS.map((m) => m.id) as [
  string,
  ...string[],
];

export const marketplaceShippingSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(6).max(32),
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  region: z.string().min(2).max(100),
  postalCode: z.string().min(3).max(20),
});

export const marketplaceCheckoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional().nullable(),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1)
    .max(50),
  shipping: marketplaceShippingSchema,
  shippingMethod: z.enum(shippingMethodIds),
  paymentMethod: z.enum(["cash", "gcash", "card", "bank_transfer", "credit"]),
  savedPaymentMethodId: z.string().min(1).max(64).optional(),
  cardPayment: marketplaceCardPaymentSchema.optional(),
  gcashPayment: marketplaceGcashPaymentSchema.optional(),
  bankTransferPayment: marketplaceBankTransferPaymentSchema.optional(),
  codPayment: marketplaceCodPaymentSchema.optional(),
  /** Verified PayMongo Payment Intent id (card / GCash when PayMongo is enabled). */
  paymongoPaymentIntentId: z.string().min(1).max(64).optional(),
  notes: z.string().max(500).optional(),
  saveAddress: z.boolean().optional(),
  savePaymentMethod: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.paymentMethod === "card" && data.paymongoPaymentIntentId) {
    return;
  }
  if (data.paymentMethod === "card" && !data.savedPaymentMethodId && !data.cardPayment) {
    ctx.addIssue({
      code: "custom",
      message: "Select a saved card or enter card details",
      path: ["cardPayment"],
    });
  }
  if (data.paymentMethod === "gcash" && data.paymongoPaymentIntentId) {
    return;
  }
  if (data.paymentMethod === "gcash" && !data.savedPaymentMethodId && !data.gcashPayment) {
    ctx.addIssue({
      code: "custom",
      message: "Select a saved GCash account or enter your mobile number",
      path: ["gcashPayment"],
    });
  }
  if (data.paymentMethod === "bank_transfer" && !data.bankTransferPayment) {
    ctx.addIssue({
      code: "custom",
      message: "Enter bank transfer details and reference number",
      path: ["bankTransferPayment"],
    });
  }
  if (
    data.paymentMethod === "bank_transfer" &&
    data.bankTransferPayment &&
    !data.savedPaymentMethodId &&
    (!data.bankTransferPayment.depositorName || !data.bankTransferPayment.depositorBank)
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Enter your bank account name and bank",
      path: ["bankTransferPayment"],
    });
  }
  if (data.paymentMethod === "cash" && !data.codPayment?.codAcknowledged) {
    ctx.addIssue({
      code: "custom",
      message: "Confirm cash on delivery terms to continue",
      path: ["codPayment"],
    });
  }
});

export type MarketplaceCheckoutInput = z.infer<typeof marketplaceCheckoutSchema>;
