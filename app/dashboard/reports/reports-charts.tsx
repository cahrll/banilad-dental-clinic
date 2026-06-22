"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCents } from "@/lib/money";

export type RevenuePoint = {
  bucket: string;
  label: string;
  cents: number;
  amount: number;
};
export type DentistRow = { name: string; count: number };
export type ProcedureRow = { name: string; count: number; cents: number };

const revenueConfig = {
  amount: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig;

const apptConfig = {
  count: { label: "Appointments", color: "var(--chart-2)" },
} satisfies ChartConfig;

const procedureConfig = {
  count: { label: "Times performed", color: "var(--chart-3)" },
} satisfies ChartConfig;

const CHART_TICK = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fill: "var(--muted-foreground)",
} as const;


export function RevenueChart({
  revenueSeries,
}: {
  revenueSeries: RevenuePoint[];
}) {
  if (revenueSeries.every((p) => p.cents === 0)) {
    return <EmptyState message="No payments recorded in this window." />;
  }
  return (
    <ChartContainer config={revenueConfig} className="h-72 w-full">
      <LineChart
        data={revenueSeries}
        margin={{ left: 4, right: 12, top: 8, bottom: 0 }}
      >
        <CartesianGrid
          vertical={false}
          stroke="var(--border)"
          strokeOpacity={0.6}
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tick={CHART_TICK}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) =>
            new Intl.NumberFormat("en-PH", {
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(v)
          }
          width={48}
          tick={CHART_TICK}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelKey="label"
              formatter={(value) => formatCents(Number(value) * 100)}
            />
          }
        />
        <Line
          dataKey="amount"
          type="monotone"
          stroke="var(--color-amount)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}

/* ─── Appointments per dentist ────────────────────────────────── */

export function AppointmentsPerDentistChart({
  appointmentsPerDentist,
}: {
  appointmentsPerDentist: DentistRow[];
}) {
  if (appointmentsPerDentist.length === 0) {
    return <EmptyState message="No scheduled appointments yet." />;
  }
  return (
    <ChartContainer config={apptConfig} className="h-72 w-full">
      <BarChart
        data={appointmentsPerDentist}
        margin={{ left: 4, right: 12, top: 8, bottom: 0 }}
        layout="vertical"
      >
        <CartesianGrid
          horizontal={false}
          stroke="var(--border)"
          strokeOpacity={0.6}
        />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={CHART_TICK}
        />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={120}
          tick={CHART_TICK}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent labelKey="name" />}
        />
        <Bar dataKey="count" fill="var(--color-count)" radius={[0, 2, 2, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

/* ─── Top procedures ──────────────────────────────────────────── */

export function TopProceduresChart({
  topProcedures,
}: {
  topProcedures: ProcedureRow[];
}) {
  if (topProcedures.length === 0) {
    return <EmptyState message="No treatments logged yet." />;
  }
  return (
    <ChartContainer config={procedureConfig} className="h-72 w-full">
      <BarChart
        data={topProcedures}
        margin={{ left: 4, right: 12, top: 8, bottom: 0 }}
        layout="vertical"
      >
        <CartesianGrid
          horizontal={false}
          stroke="var(--border)"
          strokeOpacity={0.6}
        />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          tick={CHART_TICK}
        />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={140}
          tick={CHART_TICK}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelKey="name"
              formatter={(value, _name, item) => {
                const cents =
                  (item?.payload as ProcedureRow | undefined)?.cents ?? 0;
                return `${value} × · ${formatCents(cents)}`;
              }}
            />
          }
        />
        <Bar dataKey="count" fill="var(--color-count)" radius={[0, 2, 2, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="grid h-72 place-items-center border border-dashed border-border font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
      {message}
    </div>
  );
}
