// Currency helpers. Money is stored as integer cents everywhere; PHP is the
// clinic's currency.

export const CURRENCY = "PHP";
export const LOCALE = "en-PH";

export function formatCents(cents: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function decimalToCents(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const n = Number.parseFloat(trimmed);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}
