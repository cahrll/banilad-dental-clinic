"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registerPatientAction } from "@/lib/auth/actions";
import { initialAuthState, toFieldErrors } from "@/lib/auth/form-state";

const MONO_LABEL =
  "font-mono text-[11px] uppercase tracking-wider text-muted-foreground";

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerPatientAction, initialAuthState);

  return (
    <form action={action}>
      <FieldGroup>
        {state.formError ? (
          <Alert variant="destructive">
            <AlertDescription>{state.formError}</AlertDescription>
          </Alert>
        ) : null}

        <TextField
          id="name"
          label="Display name"
          autoComplete="name"
          errors={state.fieldErrors?.name}
        />

        <div className="grid grid-cols-2 gap-3">
          <TextField
            id="firstName"
            label="First name"
            autoComplete="given-name"
            errors={state.fieldErrors?.firstName}
          />
          <TextField
            id="lastName"
            label="Last name"
            autoComplete="family-name"
            errors={state.fieldErrors?.lastName}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={!!state.fieldErrors?.sex}>
            <FieldLabel htmlFor="sex" className={MONO_LABEL}>Sex</FieldLabel>
            <Select name="sex" defaultValue={undefined}>
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
            autoComplete="bday"
            errors={state.fieldErrors?.dateOfBirth}
          />
        </div>

        <TextField
          id="phone"
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          errors={state.fieldErrors?.phone}
          required={false}
        />

        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          errors={state.fieldErrors?.email}
        />

        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          errors={state.fieldErrors?.password}
          hint="At least 8 characters with a letter and a number."
        />

        <TextField
          id="confirmPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          errors={state.fieldErrors?.confirmPassword}
        />

        <Button
          type="submit"
          disabled={pending}
          className="w-full font-mono text-xs uppercase tracking-wider"
          size="lg"
        >
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </FieldGroup>
    </form>
  );
}

function TextField({
  id,
  label,
  type = "text",
  autoComplete,
  errors,
  required = true,
  hint,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  errors?: string[];
  required?: boolean;
  hint?: string;
}) {
  const hasErrors = !!errors?.length;
  return (
    <Field data-invalid={hasErrors}>
      <FieldLabel htmlFor={id} className={MONO_LABEL}>
        {label}
      </FieldLabel>
      <Input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={hasErrors}
      />
      {hint && !hasErrors ? <FieldDescription>{hint}</FieldDescription> : null}
      <FieldError errors={toFieldErrors(errors)} />
    </Field>
  );
}

