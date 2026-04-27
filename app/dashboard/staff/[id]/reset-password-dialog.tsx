"use client";

import { useActionState, useState } from "react";
import { Copy, Key, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { resetPasswordAction } from "@/lib/actions/staff";
import {
  initialPasswordResetState,
  toFieldErrors,
} from "@/lib/auth/form-state";

export function ResetPasswordDialog({
  staffUserId,
  staffName,
}: {
  staffUserId: string;
  staffName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    resetPasswordAction.bind(null, staffUserId),
    initialPasswordResetState,
  );
  const [copied, setCopied] = useState(false);

  function handleClose() {
    setOpen(false);
    setCopied(false);
  }

  async function copyToClipboard() {
    if (!state.tempPassword) return;
    try {
      await navigator.clipboard.writeText(state.tempPassword);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else setOpen(true);
      }}
    >
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Key aria-hidden /> Reset password
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password for {staffName}</DialogTitle>
          <DialogDescription>
            Leave blank to generate a temporary password. Their existing sessions
            will be revoked immediately and they&apos;ll need to sign in again.
          </DialogDescription>
        </DialogHeader>

        {state.ok && state.tempPassword ? (
          <div className="space-y-3">
            <Alert>
              <AlertDescription>
                Password updated. Copy this <strong>once</strong> — it won&apos;t
                be shown again.
              </AlertDescription>
            </Alert>
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
              <code className="flex-1 select-all break-all px-2 font-mono text-sm">
                {state.tempPassword}
              </code>
              <Button size="sm" variant="outline" onClick={copyToClipboard}>
                <Copy aria-hidden /> {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form action={action}>
            <FieldGroup>
              {state.error ? (
                <Alert variant="destructive">
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              ) : null}

              <Field data-invalid={!!state.fieldErrors?.password}>
                <FieldLabel htmlFor="password">
                  New password (optional)
                </FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="text"
                  autoComplete="off"
                  minLength={8}
                  maxLength={200}
                  placeholder="Leave blank to auto-generate"
                />
                <FieldDescription>
                  Min 8 characters with at least one letter and one number.
                </FieldDescription>
                <FieldError errors={toFieldErrors(state.fieldErrors?.password)} />
              </Field>
            </FieldGroup>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                <RefreshCw aria-hidden />
                {pending ? "Resetting…" : "Reset password"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
