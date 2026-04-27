"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  FieldContent,
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
import {
  createStaffAction,
  updateStaffAction,
} from "@/lib/actions/staff";
import {
  initialStaffFormState,
  toFieldErrors,
} from "@/lib/auth/form-state";

export type StaffFormDefaults = {
  name: string;
  email: string;
  phone: string | null;
  role: "ADMIN" | "DENTIST" | "RECEPTIONIST";
  isActive: boolean;
  licenseNo: string | null;
  specialty: string | null;
  bio: string | null;
  position: string | null;
};

export function StaffForm({
  mode,
  staffUserId,
  defaults,
  isSelf,
}: {
  mode: "create" | "edit";
  staffUserId?: string;
  defaults?: StaffFormDefaults;
  isSelf?: boolean;
}) {
  const action =
    mode === "edit" && staffUserId
      ? updateStaffAction.bind(null, staffUserId)
      : createStaffAction;
  const [state, formAction, pending] = useActionState(action, initialStaffFormState);

  const [role, setRole] = useState<StaffFormDefaults["role"]>(defaults?.role ?? "DENTIST");
  const [isActive, setIsActive] = useState<boolean>(defaults?.isActive ?? true);

  return (
    <form action={formAction}>
      <FieldGroup>
        {state.formError ? (
          <Alert variant="destructive">
            <AlertDescription>{state.formError}</AlertDescription>
          </Alert>
        ) : null}

        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field data-invalid={!!state.fieldErrors?.name}>
            <FieldLabel htmlFor="name">Full name</FieldLabel>
            <Input
              id="name"
              name="name"
              required
              maxLength={120}
              defaultValue={defaults?.name ?? ""}
            />
            <FieldError errors={toFieldErrors(state.fieldErrors?.name)} />
          </Field>
          <Field data-invalid={!!state.fieldErrors?.email}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              required
              maxLength={200}
              defaultValue={defaults?.email ?? ""}
            />
            <FieldError errors={toFieldErrors(state.fieldErrors?.email)} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field data-invalid={!!state.fieldErrors?.phone}>
            <FieldLabel htmlFor="phone">Phone (optional)</FieldLabel>
            <Input
              id="phone"
              name="phone"
              maxLength={40}
              defaultValue={defaults?.phone ?? ""}
            />
            <FieldError errors={toFieldErrors(state.fieldErrors?.phone)} />
          </Field>
          <Field data-invalid={!!state.fieldErrors?.role}>
            <FieldLabel htmlFor="role-trigger">Role</FieldLabel>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as StaffFormDefaults["role"])}
              disabled={isSelf}
            >
              <SelectTrigger id="role-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="DENTIST">Dentist</SelectItem>
                <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
              </SelectContent>
            </Select>
            {isSelf ? (
              <FieldDescription>You can&apos;t change your own role.</FieldDescription>
            ) : null}
            <FieldError errors={toFieldErrors(state.fieldErrors?.role)} />
          </Field>
        </div>

        {role === "DENTIST" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field data-invalid={!!state.fieldErrors?.licenseNo}>
                <FieldLabel htmlFor="licenseNo">License number</FieldLabel>
                <Input
                  id="licenseNo"
                  name="licenseNo"
                  required
                  maxLength={60}
                  defaultValue={defaults?.licenseNo ?? ""}
                />
                <FieldError errors={toFieldErrors(state.fieldErrors?.licenseNo)} />
              </Field>
              <Field data-invalid={!!state.fieldErrors?.specialty}>
                <FieldLabel htmlFor="specialty">Specialty (optional)</FieldLabel>
                <Input
                  id="specialty"
                  name="specialty"
                  maxLength={120}
                  placeholder="e.g. Orthodontics"
                  defaultValue={defaults?.specialty ?? ""}
                />
                <FieldError errors={toFieldErrors(state.fieldErrors?.specialty)} />
              </Field>
            </div>
            <Field data-invalid={!!state.fieldErrors?.bio}>
              <FieldLabel htmlFor="bio">Bio (optional)</FieldLabel>
              <Textarea
                id="bio"
                name="bio"
                rows={3}
                maxLength={2000}
                defaultValue={defaults?.bio ?? ""}
              />
              <FieldError errors={toFieldErrors(state.fieldErrors?.bio)} />
            </Field>
          </>
        ) : (
          <Field data-invalid={!!state.fieldErrors?.position}>
            <FieldLabel htmlFor="position">Position</FieldLabel>
            <Input
              id="position"
              name="position"
              required
              maxLength={80}
              placeholder={role === "ADMIN" ? "Clinic Administrator" : "Receptionist"}
              defaultValue={defaults?.position ?? ""}
            />
            <FieldError errors={toFieldErrors(state.fieldErrors?.position)} />
          </Field>
        )}

        {mode === "create" ? (
          <Field data-invalid={!!state.fieldErrors?.password}>
            <FieldLabel htmlFor="password">Initial password</FieldLabel>
            <Input
              id="password"
              name="password"
              type="text"
              autoComplete="off"
              required
              minLength={8}
              maxLength={200}
            />
            <FieldDescription>
              Share this with the new staff member. They can change it once they sign in.
            </FieldDescription>
            <FieldError errors={toFieldErrors(state.fieldErrors?.password)} />
          </Field>
        ) : null}

        <Field
          orientation="horizontal"
          data-invalid={!!state.fieldErrors?.isActive}
        >
          <FieldContent>
            <FieldLabel htmlFor="isActive">Active</FieldLabel>
            <FieldDescription>
              Inactive accounts can&apos;t sign in.
            </FieldDescription>
            <FieldError errors={toFieldErrors(state.fieldErrors?.isActive)} />
          </FieldContent>
          <Switch
            id="isActive"
            checked={isActive}
            onCheckedChange={setIsActive}
            disabled={isSelf}
          />
        </Field>
      </FieldGroup>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <Button asChild variant="outline" disabled={pending}>
          <Link
            href={
              mode === "edit" && staffUserId
                ? `/dashboard/staff/${staffUserId}`
                : "/dashboard/staff"
            }
          >
            Cancel
          </Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Create staff"}
        </Button>
      </div>
    </form>
  );
}
