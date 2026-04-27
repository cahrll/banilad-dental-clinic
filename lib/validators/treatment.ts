import { z } from "zod";
import { ALL_TEETH, TOOTH_STATUS_VALUES } from "@/lib/teeth";

const toothNumberSchema = z
  .number()
  .int()
  .refine((n) => ALL_TEETH.includes(n), "Invalid tooth number.");

export const ToothEntrySchema = z.object({
  toothNumber: toothNumberSchema,
  surface: z.string().trim().max(40).optional().or(z.literal("").transform(() => undefined)),
  note: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
});

export const TreatmentCreateSchema = z.object({
  patientId: z.string().min(1).regex(/^[0-9a-fA-F]{24}$/, "Invalid id."),
  dentistId: z.string().min(1).regex(/^[0-9a-fA-F]{24}$/, "Invalid id."),
  appointmentId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid id.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  procedure: z.string().trim().min(1, "Procedure is required.").max(200),
  diagnosis: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
  performedAt: z
    .string()
    .min(1, "Date is required.")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date."),
  feeCents: z
    .number()
    .int()
    .min(0, "Fee can't be negative.")
    .max(99_999_999, "Fee too large."),
  toothEntries: z.array(ToothEntrySchema).max(32),
  // Optional resulting status applied to every tooth in toothEntries.
  resultingStatus: z.enum(TOOTH_STATUS_VALUES as [string, ...string[]]).optional(),
});

export type TreatmentCreateInput = z.infer<typeof TreatmentCreateSchema>;

export const ToothConditionSchema = z.object({
  toothNumber: toothNumberSchema,
  status: z.enum(TOOTH_STATUS_VALUES as [string, ...string[]]),
  note: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
});

export type ToothConditionInput = z.infer<typeof ToothConditionSchema>;
