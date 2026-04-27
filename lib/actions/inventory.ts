"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole, requireStaff } from "@/lib/auth/guards";
import {
  InventoryItemCreateSchema,
  InventoryItemUpdateSchema,
  StockMovementSchema,
} from "@/lib/validators/inventory";
import type {
  InventoryActionState,
  InventoryFormState,
} from "@/lib/auth/form-state";
import type { StockMovementType } from "@/generated/prisma/client";

function parseIntField(formData: FormData, name: string): number | null {
  const raw = formData.get(name);
  if (typeof raw !== "string") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isNaN(n) ? null : n;
}

function itemFromFormData(formData: FormData): Record<string, unknown> {
  const get = (n: string) => {
    const v = formData.get(n);
    return typeof v === "string" ? v : undefined;
  };
  return {
    name: get("name"),
    sku: get("sku"),
    unit: get("unit"),
    stockOnHand: parseIntField(formData, "stockOnHand") ?? 0,
    reorderPoint: parseIntField(formData, "reorderPoint") ?? 0,
    unitCostCents: parseIntField(formData, "unitCostCents") ?? 0,
    supplier: get("supplier"),
    notes: get("notes"),
  };
}

// ----- Create -----

export async function createInventoryItemAction(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const { user } = await requireStaff();

  const parsed = InventoryItemCreateSchema.safeParse(itemFromFormData(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const data = parsed.data;

  if (data.sku) {
    const existing = await prisma.inventoryItem.findUnique({
      where: { sku: data.sku },
      select: { id: true },
    });
    if (existing) {
      return { ok: false, fieldErrors: { sku: ["SKU already in use."] } };
    }
  }

  const item = await prisma.inventoryItem.create({
    data: {
      name: data.name,
      sku: data.sku ?? null,
      unit: data.unit,
      stockOnHand: data.stockOnHand,
      reorderPoint: data.reorderPoint,
      unitCostCents: data.unitCostCents,
      supplier: data.supplier ?? null,
      notes: data.notes ?? null,
      isActive: true,
    },
    select: { id: true },
  });

  // Record an opening-stock movement so the audit log has a starting point.
  if (data.stockOnHand > 0) {
    await prisma.stockMovement.create({
      data: {
        itemId: item.id,
        type: "IN",
        quantity: data.stockOnHand,
        reason: "Opening stock",
        recordedById: user.id,
      },
    });
  }

  revalidatePath("/dashboard/inventory");
  redirect(`/dashboard/inventory/${item.id}`);
}

// ----- Update meta (not stock — stock changes only via movements) -----

export async function updateInventoryItemAction(
  itemId: string,
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  await requireStaff();

  const parsed = InventoryItemUpdateSchema.safeParse(itemFromFormData(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors, itemId };
  }
  const data = parsed.data;

  if (data.sku) {
    const conflict = await prisma.inventoryItem.findFirst({
      where: { sku: data.sku, NOT: { id: itemId } },
      select: { id: true },
    });
    if (conflict) {
      return { ok: false, fieldErrors: { sku: ["SKU already in use."] }, itemId };
    }
  }

  const existing = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, formError: "Item not found.", itemId };
  }

  await prisma.inventoryItem.update({
    where: { id: itemId },
    data: {
      name: data.name,
      sku: data.sku ?? null,
      unit: data.unit,
      reorderPoint: data.reorderPoint,
      unitCostCents: data.unitCostCents,
      supplier: data.supplier ?? null,
      notes: data.notes ?? null,
    },
  });

  revalidatePath("/dashboard/inventory");
  revalidatePath(`/dashboard/inventory/${itemId}`);
  redirect(`/dashboard/inventory/${itemId}`);
}

// ----- Activate / deactivate (soft archive) -----

export async function setInventoryActiveAction(
  itemId: string,
  isActive: boolean,
): Promise<InventoryActionState> {
  await requireStaff();

  await prisma.inventoryItem.update({
    where: { id: itemId },
    data: { isActive },
  });

  revalidatePath("/dashboard/inventory");
  revalidatePath(`/dashboard/inventory/${itemId}`);
  return { ok: true };
}

// ----- Hard delete (admin) — only when no movements other than opening -----

export async function deleteInventoryItemAction(
  itemId: string,
): Promise<InventoryActionState> {
  await requireRole("ADMIN");

  const movements = await prisma.stockMovement.count({
    where: { itemId, NOT: { reason: "Opening stock" } },
  });
  if (movements > 0) {
    return {
      ok: false,
      error: `Can't delete: ${movements} movement${movements === 1 ? "" : "s"} on file. Deactivate instead.`,
    };
  }

  await prisma.stockMovement.deleteMany({ where: { itemId } });
  await prisma.inventoryItem.delete({ where: { id: itemId } });

  revalidatePath("/dashboard/inventory");
  redirect("/dashboard/inventory");
}

// ----- Record a movement -----

export async function recordStockMovementAction(
  itemId: string,
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const { user } = await requireStaff();

  const quantityRaw = parseIntField(formData, "quantity");
  const parsed = StockMovementSchema.safeParse({
    type: formData.get("type"),
    quantity: quantityRaw,
    direction: formData.get("direction") ?? undefined,
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error:
        z.flattenError(parsed.error).fieldErrors.quantity?.[0] ??
        z.flattenError(parsed.error).fieldErrors.type?.[0] ??
        z.flattenError(parsed.error).fieldErrors.direction?.[0] ??
        "Invalid movement.",
    };
  }

  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    select: { id: true, stockOnHand: true, isActive: true },
  });
  if (!item) return { ok: false, error: "Item not found." };
  if (!item.isActive) return { ok: false, error: "Item is inactive." };

  const type = parsed.data.type as StockMovementType;
  const qty = parsed.data.quantity;

  // Compute the resulting stockOnHand based on type + (for ADJUSTMENT) direction.
  let nextStock = item.stockOnHand;
  if (type === "IN") nextStock += qty;
  else if (type === "OUT") nextStock -= qty;
  else if (type === "ADJUSTMENT") {
    nextStock += parsed.data.direction === "INCREASE" ? qty : -qty;
  }

  if (nextStock < 0) {
    return {
      ok: false,
      error: `Stock can't go below 0 (current ${item.stockOnHand}, attempted change ${nextStock - item.stockOnHand}).`,
    };
  }

  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        itemId,
        type,
        quantity: qty,
        reason:
          type === "ADJUSTMENT" && parsed.data.direction === "DECREASE"
            ? `(decrease) ${parsed.data.reason ?? ""}`.trim()
            : parsed.data.reason ?? null,
        recordedById: user.id,
      },
    }),
    prisma.inventoryItem.update({
      where: { id: itemId },
      data: { stockOnHand: nextStock },
    }),
  ]);

  revalidatePath("/dashboard/inventory");
  revalidatePath(`/dashboard/inventory/${itemId}`);
  return { ok: true };
}
