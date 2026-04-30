import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/generated/prisma/client";

const labels: Record<AppointmentStatus, string> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

const tones: Record<AppointmentStatus, string> = {
  SCHEDULED: "border-warning/40 bg-warning/10 text-warning",
  CONFIRMED: "border-info/40 bg-info/10 text-info",
  COMPLETED: "border-success/40 bg-success/10 text-success",
  CANCELLED:
    "border-border bg-muted text-muted-foreground line-through",
  NO_SHOW: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", tones[status])}>
      {labels[status]}
    </Badge>
  );
}

export const APPOINTMENT_STATUS_LABELS = labels;
