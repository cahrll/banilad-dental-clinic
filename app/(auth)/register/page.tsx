import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { homePathForRole } from "@/lib/auth/roles";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Register · Banilad Dental Clinic" };

export default async function RegisterPage() {
  const session = await getCurrentUser();
  if (session) redirect(homePathForRole(session.user.role));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your patient account</CardTitle>
        <CardDescription>
          Once registered you can book appointments and view your records.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
