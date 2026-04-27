import { z } from "zod";

export const InventoryItemCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  sku: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  unit: z.string().trim().min(1, "Unit is required.").max(20),
  stockOnHand: z.number().int().min(0, "Can't be negative.").max(9_999_999),
  reorderPoint: z.number().int().min(0, "Can't be negative.").max(9_999_999),
  unitCostCents: z.number().int().min(0, "Can't be negative.").max(99_999_999),
  supplier: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
});

export type InventoryItemCreateInput = z.infer<typeof InventoryItemCreateSchema>;

export const InventoryItemUpdateSchema = InventoryItemCreateSchema.omit({
  stockOnHand: true,
});
export type InventoryItemUpdateInput = z.infer<typeof InventoryItemUpdateSchema>;

export const StockMovementSchema = z
  .object({
    type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
    quantity: z.number().int().min(1, "Quantity must be at least 1.").max(9_999_999),
    // ADJUSTMENT can be positive or negative; IN/OUT carry positive quantity with sign implied by `type`.
    // We let the form supply a sign-flag for ADJUSTMENT to keep `quantity` non-negative in storage.
    direction: z.enum(["INCREASE", "DECREASE"]).optional(),
    reason: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
  })
  .refine(
    (v) => v.type !== "ADJUSTMENT" || v.direction !== undefined,
    { path: ["direction"], message: "Pick increase or decrease." },
  );

export type StockMovementInput = z.infer<typeof StockMovementSchema>;
