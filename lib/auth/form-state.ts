// Shared types/constants for auth Server Actions. NOT a "use server" module —
// the actions file can only export async functions, so plain values live here.

export type FormState = {
  ok: boolean;
  formError?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialAuthState: FormState = { ok: false };

// Maps zod field-error messages into the shape shadcn's <FieldError> wants.
export function toFieldErrors(messages?: string[]) {
  return messages?.map((message) => ({ message }));
}

// ----- Patient form/delete state shared with lib/actions/patients.ts -----

export type PatientFormState = FormState & { patientId?: string };

export type DeleteState = { ok: boolean; error?: string };

export const initialPatientFormState: PatientFormState = { ok: false };
export const initialDeleteState: DeleteState = { ok: false };

// ----- Appointment shared state -----

export type AppointmentFormState = FormState & {
  appointmentId?: string;
  conflict?: boolean;
};

export const initialAppointmentFormState: AppointmentFormState = { ok: false };

export type StatusActionState = { ok: boolean; error?: string };
export const initialStatusActionState: StatusActionState = { ok: false };

// ----- Treatment shared state -----

export type TreatmentFormState = FormState & { treatmentId?: string };
export const initialTreatmentFormState: TreatmentFormState = { ok: false };

export type ConditionActionState = { ok: boolean; error?: string };
export const initialConditionActionState: ConditionActionState = { ok: false };

// ----- Invoice shared state -----

export type InvoiceFormState = FormState & { invoiceId?: string };
export const initialInvoiceFormState: InvoiceFormState = { ok: false };

export type InvoiceActionState = { ok: boolean; error?: string };
export const initialInvoiceActionState: InvoiceActionState = { ok: false };

// ----- Inventory shared state -----

export type InventoryFormState = FormState & { itemId?: string };
export const initialInventoryFormState: InventoryFormState = { ok: false };

export type InventoryActionState = { ok: boolean; error?: string };
export const initialInventoryActionState: InventoryActionState = { ok: false };

// ----- Staff shared state -----

export type StaffFormState = FormState & { staffUserId?: string };
export const initialStaffFormState: StaffFormState = { ok: false };

export type StaffActionState = { ok: boolean; error?: string };
export const initialStaffActionState: StaffActionState = { ok: false };

// resetPasswordAction returns the temp password once on success so the admin
// can copy it to the staff member. Never persisted.
export type PasswordResetState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  tempPassword?: string;
};
export const initialPasswordResetState: PasswordResetState = { ok: false };
