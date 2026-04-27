"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PatientBookDialog } from "./book-dialog";

export function PatientBookTrigger({
  dentists,
}: {
  dentists: Array<{ id: string; name: string; specialty: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus aria-hidden /> Book appointment
      </Button>
      <PatientBookDialog open={open} onOpenChange={setOpen} dentists={dentists} />
    </>
  );
}
