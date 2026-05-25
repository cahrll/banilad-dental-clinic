import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { homePathForRole } from "@/lib/auth/roles";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Banilad Dental Clinic" };

type SearchParams = { next?: string };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getCurrentUser();
  if (session) redirect(homePathForRole(session.user.role));

  const { next } = await searchParams;

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
          / sign in
        </p>
        <h1 className="text-[22px] font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Access your portal or staff console.
        </p>
      </div>

      <LoginForm next={next} />

      <p className="text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        New here?{" "}
        <Link
          href="/register"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Register as a patient
        </Link>
      </p>
    </section>
  );
}
