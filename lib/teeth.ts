// FDI two-digit notation for permanent dentition.
//   Quadrant 1 = upper right  (18→11, distal to mesial, written 18..11)
//   Quadrant 2 = upper left   (21..28)
//   Quadrant 3 = lower left   (31..38)
//   Quadrant 4 = lower right  (41..48)

import type { ToothStatus } from "@prisma/client";

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

// Inline-style dot colors for each status — sourced from CSS tokens so
// both modes adapt automatically.
export const TOOTH_STATUS_DOT_VAR: Record<ToothStatus, string> = {
  HEALTHY: "var(--tooth-healthy)",
  CARIES: "var(--tooth-caries)",
  RESTORED: "var(--tooth-restored)",
  MISSING: "var(--tooth-missing)",
  IMPLANT: "var(--tooth-implant)",
  CROWN: "var(--tooth-crown)",
  ROOT_CANAL: "var(--tooth-root_canal)",
  EXTRACTED: "var(--tooth-extracted)",
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
