"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole, requireStaff } from "@/lib/auth/guards";
import {
  InvoiceCreateSchema,
  InvoiceItemSchema,
  InvoiceMetaSchema,
  PaymentSchema,
} from "@/lib/validators/invoice";
import type {
  InvoiceActionState,
  InvoiceFormState,
} from "@/lib/auth/form-state";
import type { InvoiceStatus, PaymentMethod } from "@prisma/client";

// ----- Helpers -----

async function nextInvoiceNumber(): Promise<string> {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `INV-${ym}-`;
  const last = await prisma.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const lastSeq = last ? Number.parseInt(last.number.slice(prefix.length), 10) : 0;
  const seq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

async function recomputeInvoice(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      status: true,
      discountCents: true,
      taxCents: true,
      items: { select: { totalCents: true } },
      payments: { select: { amountCents: true } },
    },
  });
  if (!invoice) return;

  const subtotal = invoice.items.reduce((acc, i) => acc + i.totalCents, 0);
  const total = Math.max(0, subtotal - invoice.discountCents + invoice.taxCents);
  const paid = invoice.payments.reduce((acc, p) => acc + p.amountCents, 0);

  let nextStatus: InvoiceStatus = invoice.status;
  if (invoice.status !== "DRAFT" && invoice.status !== "VOID") {
    if (paid >= total && total > 0) nextStatus = "PAID";
    else if (paid > 0 && paid < total) nextStatus = "PARTIAL";
    else nextStatus = "ISSUED";
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { subtotalCents: subtotal, totalCents: total, status: nextStatus },
  });
}

function parseIntField(formData: FormData, name: string): number | null {
  const raw = formData.get(name);
  if (typeof raw !== "string") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isNaN(n) ? null : n;
}

// ----- Create a DRAFT invoice (optionally seeded from treatments) -----

export async function createDraftInvoiceAction(
  _prev: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  await requireStaff();

  const treatmentIdsRaw = formData.get("treatmentIds");
  let treatmentIds: string[] | undefined;
  if (typeof treatmentIdsRaw === "string" && treatmentIdsRaw) {
    treatmentIds = treatmentIdsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const parsed = InvoiceCreateSchema.safeParse({
    patientId: formData.get("patientId"),
    appointmentId: formData.get("appointmentId") ?? undefined,
    treatmentIds,
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const data = parsed.data;
  const patient = await prisma.patient.findUnique({
    where: { id: data.patientId },
    select: { id: true, deletedAt: true },
  });
  if (!patient || patient.deletedAt) {
    return { ok: false, fieldErrors: { patientId: ["Patient not found."] } };
  }

  // Seed line items from treatments if any provided.
  let seedItems: Array<{ description: string; quantity: number; unitPriceCents: number; totalCents: number }> = [];
  if (data.treatmentIds && data.treatmentIds.length > 0) {
    const treatments = await prisma.treatmentRecord.findMany({
      where: { id: { in: data.treatmentIds }, patientId: data.patientId },
      select: { id: true, procedure: true, feeCents: true, performedAt: true },
    });
    seedItems = treatments.map((t) => ({
      description: `${t.procedure} (${t.performedAt.toISOString().slice(0, 10)})`,
      quantity: 1,
      unitPriceCents: t.feeCents,
      totalCents: t.feeCents,
    }));
  }

  const subtotal = seedItems.reduce((acc, i) => acc + i.totalCents, 0);
  const number = await reserveInvoiceNumber();

  const created = await prisma.invoice.create({
    data: {
      patientId: data.patientId,
      appointmentId: data.appointmentId ?? null,
      number,
      status: "DRAFT",
      notes: data.notes ?? null,
      subtotalCents: subtotal,
      totalCents: subtotal,
      items: { create: seedItems },
    },
    select: { id: true },
  });

  revalidatePath("/dashboard/billing");
  revalidatePath(`/dashboard/patients/${data.patientId}`);
  redirect(`/dashboard/billing/${created.id}`);
}

// Reserve a unique invoice number with retry on collision.
async function reserveInvoiceNumber(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const n = await nextInvoiceNumber();
    const collision = await prisma.invoice.findUnique({
      where: { number: n },
      select: { id: true },
    });
    if (!collision) return n;
  }
  // Fall back to timestamp suffix.
  return `INV-${Date.now()}`;
}

// ----- Add an item to a DRAFT invoice -----

export async function addInvoiceItemAction(
  invoiceId: string,
  _prev: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  await requireStaff();

  const description = formData.get("description");
  const quantity = parseIntField(formData, "quantity");
  const unitPriceCents = parseIntField(formData, "unitPriceCents");

  const parsed = InvoiceItemSchema.safeParse({
    description,
    quantity,
    unitPriceCents,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error:
        z.flattenError(parsed.error).fieldErrors.description?.[0] ??
        z.flattenError(parsed.error).fieldErrors.quantity?.[0] ??
        z.flattenError(parsed.error).fieldErrors.unitPriceCents?.[0] ??
        "Invalid line item.",
    };
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, status: true, patientId: true },
  });
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status !== "DRAFT") {
    return { ok: false, error: "Only DRAFT invoices can be edited." };
  }

  const total = parsed.data.quantity * parsed.data.unitPriceCents;
  await prisma.invoiceItem.create({
    data: {
      invoiceId,
      description: parsed.data.description,
      quantity: parsed.data.quantity,
      unitPriceCents: parsed.data.unitPriceCents,
      totalCents: total,
    },
  });

  await recomputeInvoice(invoiceId);
  revalidatePath(`/dashboard/billing/${invoiceId}`);
  revalidatePath(`/dashboard/patients/${invoice.patientId}`);
  return { ok: true };
}

// ----- Remove an item -----

export async function removeInvoiceItemAction(
  itemId: string,
): Promise<InvoiceActionState> {
  await requireStaff();

  const item = await prisma.invoiceItem.findUnique({
    where: { id: itemId },
    select: { invoiceId: true, invoice: { select: { status: true, patientId: true } } },
  });
  if (!item) return { ok: false, error: "Line item not found." };
  if (item.invoice.status !== "DRAFT") {
    return { ok: false, error: "Only DRAFT invoices can be edited." };
  }

  await prisma.invoiceItem.delete({ where: { id: itemId } });
  await recomputeInvoice(item.invoiceId);
  revalidatePath(`/dashboard/billing/${item.invoiceId}`);
  revalidatePath(`/dashboard/patients/${item.invoice.patientId}`);
  return { ok: true };
}

// ----- Update meta (discount/tax/notes/dueAt) -----

export async function updateInvoiceMetaAction(
  invoiceId: string,
  _prev: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  await requireStaff();

  const discountCents = parseIntField(formData, "discountCents") ?? 0;
  const taxCents = parseIntField(formData, "taxCents") ?? 0;
  const dueAt = formData.get("dueAt");

  const parsed = InvoiceMetaSchema.safeParse({
    discountCents,
    taxCents,
    notes: formData.get("notes"),
    dueAt: typeof dueAt === "string" ? dueAt : "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error:
        z.flattenError(parsed.error).fieldErrors.discountCents?.[0] ??
        z.flattenError(parsed.error).fieldErrors.taxCents?.[0] ??
        z.flattenError(parsed.error).fieldErrors.dueAt?.[0] ??
        z.flattenError(parsed.error).fieldErrors.notes?.[0] ??
        "Invalid input.",
    };
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, status: true, patientId: true },
  });
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status === "VOID") {
    return { ok: false, error: "Voided invoices can't be edited." };
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      discountCents: parsed.data.discountCents,
      taxCents: parsed.data.taxCents,
      notes: parsed.data.notes ?? null,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
    },
  });

  await recomputeInvoice(invoiceId);
  revalidatePath(`/dashboard/billing/${invoiceId}`);
  revalidatePath(`/dashboard/patients/${invoice.patientId}`);
  return { ok: true };
}

// ----- Issue (DRAFT -> ISSUED) -----

export async function issueInvoiceAction(invoiceId: string): Promise<InvoiceActionState> {
  await requireStaff();

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      status: true,
      patientId: true,
      items: { select: { id: true } },
    },
  });
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status !== "DRAFT") {
    return { ok: false, error: "Only DRAFT invoices can be issued." };
  }
  if (invoice.items.length === 0) {
    return { ok: false, error: "Add at least one line item before issuing." };
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "ISSUED", issuedAt: new Date() },
  });
  await recomputeInvoice(invoiceId);

  revalidatePath(`/dashboard/billing/${invoiceId}`);
  revalidatePath("/dashboard/billing");
  revalidatePath(`/dashboard/patients/${invoice.patientId}`);
  revalidatePath("/portal/invoices");
  return { ok: true };
}

// ----- Void -----

export async function voidInvoiceAction(invoiceId: string): Promise<InvoiceActionState> {
  await requireStaff();

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, status: true, patientId: true },
  });
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status === "VOID") return { ok: true };

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "VOID" },
  });

  revalidatePath(`/dashboard/billing/${invoiceId}`);
  revalidatePath("/dashboard/billing");
  revalidatePath(`/dashboard/patients/${invoice.patientId}`);
  revalidatePath("/portal/invoices");
  return { ok: true };
}

// ----- Record payment -----

export async function recordPaymentAction(
  invoiceId: string,
  _prev: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  const { user } = await requireStaff();

  const amountCents = parseIntField(formData, "amountCents");
  const parsed = PaymentSchema.safeParse({
    amountCents,
    method: formData.get("method"),
    reference: formData.get("reference"),
    paidAt: formData.get("paidAt"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error:
        z.flattenError(parsed.error).fieldErrors.amountCents?.[0] ??
        z.flattenError(parsed.error).fieldErrors.method?.[0] ??
        z.flattenError(parsed.error).fieldErrors.paidAt?.[0] ??
        z.flattenError(parsed.error).fieldErrors.reference?.[0] ??
        "Invalid payment.",
    };
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, status: true, patientId: true },
  });
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status !== "ISSUED" && invoice.status !== "PARTIAL") {
    return { ok: false, error: "Only ISSUED or PARTIAL invoices can receive payments." };
  }

  await prisma.payment.create({
    data: {
      invoiceId,
      amountCents: parsed.data.amountCents,
      method: parsed.data.method as PaymentMethod,
      reference: parsed.data.reference ?? null,
      paidAt: new Date(parsed.data.paidAt),
      recordedById: user.id,
    },
  });

  await recomputeInvoice(invoiceId);
  revalidatePath(`/dashboard/billing/${invoiceId}`);
  revalidatePath("/dashboard/billing");
  revalidatePath(`/dashboard/patients/${invoice.patientId}`);
  revalidatePath("/portal/invoices");
  return { ok: true };
}

// ----- Delete payment (admin) -----

export async function deletePaymentAction(
  paymentId: string,
): Promise<InvoiceActionState> {
  await requireRole("ADMIN");

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, invoiceId: true, invoice: { select: { patientId: true } } },
  });
  if (!payment) return { ok: false, error: "Payment not found." };

  await prisma.payment.delete({ where: { id: paymentId } });
  await recomputeInvoice(payment.invoiceId);

  revalidatePath(`/dashboard/billing/${payment.invoiceId}`);
  revalidatePath(`/dashboard/patients/${payment.invoice.patientId}`);
  return { ok: true };
}
