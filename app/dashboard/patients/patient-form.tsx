"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createPatientAction,
  updatePatientAction,
} from "@/lib/actions/patients";
import { toFieldErrors, type PatientFormState } from "@/lib/auth/form-state";

export type PatientFormDefaults = {
  email?: string | null;
  firstName: string;
  lastName: string;
  sex: "MALE" | "FEMALE" | "OTHER" | "UNDISCLOSED";
  dateOfBirth: string; // yyyy-mm-dd
  phone?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  medicalHistory?: string | null;
  allergies?: string | null;
  insuranceProvider?: string | null;
  insurancePolicyNo?: string | null;
  notes?: string | null;
  hasPortalLogin?: boolean;
};

const initial: PatientFormState = { ok: false };

export function PatientForm({
  mode,
  patientId,
  defaults,
}: {
  mode: "create" | "edit";
  patientId?: string;
  defaults?: PatientFormDefaults;
}) {
  const action =
    mode === "edit" && patientId
      ? updatePatientAction.bind(null, patientId)
      : createPatientAction;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction}>
      <FieldGroup>
        {state.formError ? (
          <Alert variant="destructive">
            <AlertDescription>{state.formError}</AlertDescription>
          </Alert>
        ) : null}

        <FieldSet>
          <FieldLegend>Identity</FieldLegend>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                id="firstName"
                label="First name"
                defaultValue={defaults?.firstName}
                errors={state.fieldErrors?.firstName}
                autoComplete="given-name"
              />
              <TextField
                id="lastName"
                label="Last name"
                defaultValue={defaults?.lastName}
                errors={state.fieldErrors?.lastName}
                autoComplete="family-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!state.fieldErrors?.sex}>
                <FieldLabel htmlFor="sex">Sex</FieldLabel>
                <Select name="sex" defaultValue={defaults?.sex ?? undefined}>
                  <SelectTrigger id="sex" aria-invalid={!!state.fieldErrors?.sex}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                    <SelectItem value="UNDISCLOSED">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError errors={toFieldErrors(state.fieldErrors?.sex)} />
              </Field>
              <TextField
                id="dateOfBirth"
                label="Date of birth"
                type="date"
                defaultValue={defaults?.dateOfBirth}
                errors={state.fieldErrors?.dateOfBirth}
                autoComplete="bday"
              />
            </div>

            <TextField
              id="phone"
              label="Phone"
              type="tel"
              defaultValue={defaults?.phone ?? undefined}
              errors={state.fieldErrors?.phone}
              required={false}
              autoComplete="tel"
            />

            <TextareaField
              id="address"
              label="Address"
              defaultValue={defaults?.address ?? undefined}
              errors={state.fieldErrors?.address}
              required={false}
              rows={2}
            />
          </FieldGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Emergency contact</FieldLegend>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                id="emergencyContactName"
                label="Name"
                defaultValue={defaults?.emergencyContactName ?? undefined}
                errors={state.fieldErrors?.emergencyContactName}
                required={false}
              />
              <TextField
                id="emergencyContactPhone"
                label="Phone"
                type="tel"
                defaultValue={defaults?.emergencyContactPhone ?? undefined}
                errors={state.fieldErrors?.emergencyContactPhone}
                required={false}
              />
            </div>
          </FieldGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Medical</FieldLegend>
          <FieldGroup>
            <TextareaField
              id="medicalHistory"
              label="Medical history"
              defaultValue={defaults?.medicalHistory ?? undefined}
              errors={state.fieldErrors?.medicalHistory}
              required={false}
              rows={3}
            />
            <TextareaField
              id="allergies"
              label="Allergies"
              defaultValue={defaults?.allergies ?? undefined}
              errors={state.fieldErrors?.allergies}
              required={false}
              rows={2}
            />
          </FieldGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Insurance</FieldLegend>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                id="insuranceProvider"
                label="Provider"
                defaultValue={defaults?.insuranceProvider ?? undefined}
                errors={state.fieldErrors?.insuranceProvider}
                required={false}
              />
              <TextField
                id="insurancePolicyNo"
                label="Policy number"
                defaultValue={defaults?.insurancePolicyNo ?? undefined}
                errors={state.fieldErrors?.insurancePolicyNo}
                required={false}
              />
            </div>
          </FieldGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Notes</FieldLegend>
          <FieldGroup>
            <TextareaField
              id="notes"
              label="Internal notes"
              defaultValue={defaults?.notes ?? undefined}
              errors={state.fieldErrors?.notes}
              required={false}
              rows={3}
            />
          </FieldGroup>
        </FieldSet>

        {mode === "create" ? (
          <FieldSet>
            <FieldLegend>Patient portal account (optional)</FieldLegend>
            <FieldGroup>
              <FieldDescription>
                If both fields are filled, the patient can sign in at the portal. Leave both blank to create a record without portal access.
              </FieldDescription>
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  id="email"
                  label="Email"
                  type="email"
                  errors={state.fieldErrors?.email}
                  required={false}
                  autoComplete="email"
                />
                <TextField
                  id="password"
                  label="Initial password"
                  type="password"
                  errors={state.fieldErrors?.password}
                  required={false}
                  autoComplete="new-password"
                />
              </div>
            </FieldGroup>
          </FieldSet>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button asChild variant="outline" disabled={pending}>
            <Link href={mode === "edit" && patientId ? `/dashboard/patients/${patientId}` : "/dashboard/patients"}>
              Cancel
            </Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Create patient"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

function TextField({
  id,
  label,
  type = "text",
  defaultValue,
  errors,
  required = true,
  autoComplete,
}: {
  id: string;
  label: string;
  type?: string;
  defaultValue?: string;
  errors?: string[];
  required?: boolean;
  autoComplete?: string;
}) {
  const hasErrors = !!errors?.length;
  return (
    <Field data-invalid={hasErrors}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={id}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        aria-invalid={hasErrors}
        autoComplete={autoComplete}
      />
      <FieldError errors={toFieldErrors(errors)} />
    </Field>
  );
}

function TextareaField({
  id,
  label,
  defaultValue,
  errors,
  required = true,
  rows = 3,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  errors?: string[];
  required?: boolean;
  rows?: number;
}) {
  const hasErrors = !!errors?.length;
  return (
    <Field data-invalid={hasErrors}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        id={id}
        name={id}
        defaultValue={defaultValue ?? ""}
        required={required}
        aria-invalid={hasErrors}
        rows={rows}
      />
      <FieldError errors={toFieldErrors(errors)} />
    </Field>
  );
}
