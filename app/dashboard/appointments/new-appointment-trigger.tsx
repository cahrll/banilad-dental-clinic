"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewAppointmentDialog } from "./new-appointment-dialog";

export function NewAppointmentTrigger({
  dentists,
  defaultDentistId,
  defaultStart,
}: {
  dentists: Array<{ id: string; name: string }>;
  defaultDentistId?: string;
  defaultStart: Date;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus aria-hidden /> New appointment
      </Button>
      <NewAppointmentDialog
        open={open}
        onOpenChange={setOpen}
        dentists={dentists}
        defaultDentistId={defaultDentistId}
        defaultStart={defaultStart}
      />
    </>
  );
}
