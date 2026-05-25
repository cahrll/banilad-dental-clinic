"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { loginAction } from "@/lib/auth/actions";
import { initialAuthState, toFieldErrors } from "@/lib/auth/form-state";


const MONO_LABEL =
  "font-mono text-[11px] uppercase tracking-wider text-muted-foreground";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, initialAuthState);

  return (
    <form action={action}>
      <FieldGroup>
        {next ? <input type="hidden" name="next" value={next} /> : null}

        {state.formError ? (
          <Alert variant="destructive">
            <AlertDescription>{state.formError}</AlertDescription>
          </Alert>
        ) : null}

        <Field data-invalid={!!state.fieldErrors?.email}>
          <FieldLabel htmlFor="email" className={MONO_LABEL}>Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={!!state.fieldErrors?.email}
          />
          <FieldError errors={toFieldErrors(state.fieldErrors?.email)} />
        </Field>

        <Field data-invalid={!!state.fieldErrors?.password}>
          <FieldLabel htmlFor="password" className={MONO_LABEL}>Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={!!state.fieldErrors?.password}
          />
          <FieldError errors={toFieldErrors(state.fieldErrors?.password)} />
        </Field>

        <Button
          type="submit"
          disabled={pending}
          className="w-full font-mono text-xs uppercase tracking-wider"
          size="lg"
        >
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </FieldGroup>
    </form>
  );
}

