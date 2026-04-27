import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth/actions";

export function LogoutButton({ variant = "ghost" }: { variant?: "ghost" | "outline" }) {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant={variant} size="sm">
        <LogOut aria-hidden />
        Log out
      </Button>
    </form>
  );
}
