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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCents } from "@/lib/money";

type RevenuePoint = {
  bucket: string;
  label: string;
  cents: number;
  amount: number;
};

type DentistRow = { name: string; count: number };
type ProcedureRow = { name: string; count: number; cents: number };

const revenueConfig = {
  amount: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig;

const apptConfig = {
  count: { label: "Appointments", color: "var(--chart-2)" },
} satisfies ChartConfig;

const procedureConfig = {
  count: { label: "Times performed", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function ReportsCharts({
  revenueSeries,
  appointmentsPerDentist,
  topProcedures,
  bucketByMonth,
}: {
  revenueSeries: RevenuePoint[];
  appointmentsPerDentist: DentistRow[];
  topProcedures: ProcedureRow[];
  bucketByMonth: boolean;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">
            Revenue ({bucketByMonth ? "monthly" : "daily"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {revenueSeries.every((p) => p.cents === 0) ? (
            <EmptyState message="No payments recorded in this window." />
          ) : (
            <ChartContainer config={revenueConfig} className="h-72 w-full">
              <LineChart
                data={revenueSeries}
                margin={{ left: 4, right: 12, top: 8, bottom: 0 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
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
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appointments per dentist</CardTitle>
        </CardHeader>
        <CardContent>
          {appointmentsPerDentist.length === 0 ? (
            <EmptyState message="No scheduled appointments yet." />
          ) : (
            <ChartContainer config={apptConfig} className="h-72 w-full">
              <BarChart
                data={appointmentsPerDentist}
                margin={{ left: 4, right: 12, top: 8, bottom: 0 }}
                layout="vertical"
              >
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  width={120}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent labelKey="name" />}
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top procedures</CardTitle>
        </CardHeader>
        <CardContent>
          {topProcedures.length === 0 ? (
            <EmptyState message="No treatments logged yet." />
          ) : (
            <ChartContainer config={procedureConfig} className="h-72 w-full">
              <BarChart
                data={topProcedures}
                margin={{ left: 4, right: 12, top: 8, bottom: 0 }}
                layout="vertical"
              >
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  width={140}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelKey="name"
                      formatter={(value, _name, item) => {
                        const cents = (item?.payload as ProcedureRow | undefined)?.cents ?? 0;
                        return `${value} × · ${formatCents(cents)}`;
                      }}
                    />
                  }
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="grid h-72 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
      {message}
    </div>
  );
}
