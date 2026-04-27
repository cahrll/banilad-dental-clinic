import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in to access your portal.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm next={next} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
            Register as a patient
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
