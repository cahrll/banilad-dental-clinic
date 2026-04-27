import { z } from "zod";

const objectId = z.string().min(1, "Required.").regex(/^[0-9a-fA-F]{24}$/, "Invalid id.");

export const InvoiceItemSchema = z.object({
  description: z.string().trim().min(1, "Description is required.").max(200),
  quantity: z.number().int().min(1, "Quantity must be at least 1.").max(9999),
  unitPriceCents: z.number().int().min(0, "Price can't be negative.").max(99_999_999),
});

export type InvoiceItemInput = z.infer<typeof InvoiceItemSchema>;

export const InvoiceMetaSchema = z.object({
  discountCents: z.number().int().min(0).max(99_999_999),
  taxCents: z.number().int().min(0).max(99_999_999),
  notes: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
  dueAt: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined))
    .refine(
      (v) => v === undefined || !Number.isNaN(Date.parse(v)),
      "Invalid due date.",
    ),
});

export type InvoiceMetaInput = z.infer<typeof InvoiceMetaSchema>;

export const PaymentSchema = z.object({
  amountCents: z.number().int().min(1, "Amount must be at least 1 cent.").max(99_999_999),
  method: z.enum(["CASH", "CARD", "BANK_TRANSFER", "INSURANCE", "OTHER"]),
  reference: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
  paidAt: z
    .string()
    .min(1, "Date is required.")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date."),
});

export type PaymentInput = z.infer<typeof PaymentSchema>;

export const InvoiceCreateSchema = z.object({
  patientId: objectId,
  appointmentId: objectId.optional().or(z.literal("").transform(() => undefined)),
  // Optional list of treatment ids to seed line items from.
  treatmentIds: z.array(objectId).max(50).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
});

export type InvoiceCreateInput = z.infer<typeof InvoiceCreateSchema>;
