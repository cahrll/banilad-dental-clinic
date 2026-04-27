// FDI two-digit notation for permanent dentition.
//   Quadrant 1 = upper right  (18→11, distal to mesial, written 18..11)
//   Quadrant 2 = upper left   (21..28)
//   Quadrant 3 = lower left   (31..38)
//   Quadrant 4 = lower right  (41..48)

import type { ToothStatus } from "@/generated/prisma/client";

export const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11] as const; // distal → mesial
export const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28] as const;
export const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41] as const;
export const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38] as const;

export const ALL_TEETH: number[] = [
  ...UPPER_RIGHT,
  ...UPPER_LEFT,
  ...LOWER_RIGHT,
  ...LOWER_LEFT,
];

export const TOOTH_STATUS_LABELS: Record<ToothStatus, string> = {
  HEALTHY: "Healthy",
  CARIES: "Caries",
  RESTORED: "Restored",
  MISSING: "Missing",
  IMPLANT: "Implant",
  CROWN: "Crown",
  ROOT_CANAL: "Root canal",
  EXTRACTED: "Extracted",
};

// Tailwind classes per status. Used for the small chip on each tooth.
export const TOOTH_STATUS_TONES: Record<ToothStatus, string> = {
  HEALTHY: "bg-emerald-200 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-100 border-emerald-300 dark:border-emerald-800",
  CARIES: "bg-amber-200 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100 border-amber-300 dark:border-amber-800",
  RESTORED: "bg-blue-200 text-blue-950 dark:bg-blue-950/60 dark:text-blue-100 border-blue-300 dark:border-blue-800",
  MISSING: "bg-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 line-through",
  IMPLANT: "bg-violet-200 text-violet-950 dark:bg-violet-950/60 dark:text-violet-100 border-violet-300 dark:border-violet-800",
  CROWN: "bg-yellow-200 text-yellow-950 dark:bg-yellow-950/60 dark:text-yellow-100 border-yellow-300 dark:border-yellow-800",
  ROOT_CANAL: "bg-rose-200 text-rose-950 dark:bg-rose-950/60 dark:text-rose-100 border-rose-300 dark:border-rose-800",
  EXTRACTED: "bg-zinc-300 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-400 dark:border-zinc-700 line-through",
};

export const TOOTH_STATUS_DOTS: Record<ToothStatus, string> = {
  HEALTHY: "bg-emerald-500",
  CARIES: "bg-amber-500",
  RESTORED: "bg-blue-500",
  MISSING: "bg-zinc-400",
  IMPLANT: "bg-violet-500",
  CROWN: "bg-yellow-500",
  ROOT_CANAL: "bg-rose-500",
  EXTRACTED: "bg-zinc-500",
};

export const TOOTH_STATUS_VALUES: ToothStatus[] = [
  "HEALTHY",
  "CARIES",
  "RESTORED",
  "MISSING",
  "IMPLANT",
  "CROWN",
  "ROOT_CANAL",
  "EXTRACTED",
];

export function isValidToothNumber(n: number): boolean {
  return ALL_TEETH.includes(n);
}

export type ToothConditionMap = Record<number, ToothStatus | undefined>;

export function buildConditionMap(
  conditions: Array<{ toothNumber: number; status: ToothStatus }>,
): ToothConditionMap {
  const map: ToothConditionMap = {};
  for (const c of conditions) map[c.toothNumber] = c.status;
  return map;
}
