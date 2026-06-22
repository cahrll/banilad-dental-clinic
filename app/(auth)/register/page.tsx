import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { homePathForRole } from "@/lib/auth/roles";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Register · Banilad Dental Clinic" };

export default async function RegisterPage() {
  const session = await getCurrentUser();
  if (session) redirect(homePathForRole(session.user.role));

  return (
    <section className="flex flex-col gap-6 border border-border bg-card p-6 sm:p-8">
      <Link href="/" className="flex items-center gap-2.5 self-start">
        <span
          aria-hidden
          className="grid size-7 place-items-center rounded-[2px] bg-primary font-mono text-[13px] font-semibold leading-none text-primary-foreground"
        >
          B
        </span>
        <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.06em]">
          BANILAD
          <span className="ml-1 font-normal text-muted-foreground">
            / clinic
          </span>
        </span>
      </Link>

      <div className="flex flex-col gap-1">
        <p
          data-tabular
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
        >
          / register
        </p>
        <h1 className="text-[22px] font-semibold tracking-tight">
          Create your patient account
        </h1>
        <p className="text-sm text-muted-foreground">
          Once registered you can book appointments and view your records.
        </p>
      </div>

      <RegisterForm />

      <p className="text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Already registered?{" "}
        <Link
          href="/login"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </section>
  );
}
