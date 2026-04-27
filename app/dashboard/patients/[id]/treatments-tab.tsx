import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/money";
import { formatDate } from "./format";

export type TreatmentRow = {
  id: string;
  procedure: string;
  diagnosis: string | null;
  notes: string | null;
  performedAt: string; // ISO
  feeCents: number;
  dentistName: string;
  toothNumbers: number[];
};

export function TreatmentsTab({
  patientId,
  treatments,
}: {
  patientId: string;
  treatments: TreatmentRow[];
}) {
  const totalCents = treatments.reduce((acc, t) => acc + t.feeCents, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {treatments.length} treatment{treatments.length === 1 ? "" : "s"} on file
          {treatments.length > 0 ? ` · total ${formatCents(totalCents)}` : ""}
        </p>
        <Button asChild size="sm">
          <Link href={`/dashboard/treatments/new?patientId=${patientId}`}>
            <Plus aria-hidden /> Record treatment
          </Link>
        </Button>
      </div>

      {treatments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No treatments recorded yet. Click <strong>Record treatment</strong> to log one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {treatments.map((t) => (
            <Card key={t.id}>
              <CardContent className="space-y-2 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{t.procedure}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(new Date(t.performedAt))} · {t.dentistName}
                    </p>
                  </div>
                  <p className="text-sm font-medium">{formatCents(t.feeCents)}</p>
                </div>
                {t.toothNumbers.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {t.toothNumbers.map((n) => (
                      <Badge key={n} variant="secondary" className="font-mono text-[10px]">
                        {n}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {t.diagnosis ? (
                  <p className="text-xs">
                    <span className="text-muted-foreground">Diagnosis: </span>
                    {t.diagnosis}
                  </p>
                ) : null}
                {t.notes ? (
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground">{t.notes}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
