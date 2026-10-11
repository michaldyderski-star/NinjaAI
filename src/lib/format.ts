const pln = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const plnShort = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  notation: "compact",
  maximumFractionDigits: 1,
});

const num2 = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 });
const num2fixed = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** grosze → "120 000,00 zł" */
export const formatMoney = (grosze: number): string => pln.format(grosze / 100);
export const formatMoneyShort = (grosze: number): string => plnShort.format(grosze / 100);

export const formatPercent = (p: number, fixed = false): string =>
  `${(fixed ? num2fixed : num2).format(p)}%`;

/** For editable fields: "1234,5" (no grouping, comma decimal). */
export const toInputString = (n: number): string =>
  Number.isFinite(n) ? String(n).replace(".", ",") : "";

/**
 * Parses user input like "120 000,50", "120000.5", "1 000". Returns null when
 * it isn't a number or has more than 2 decimal places.
 */
export function parseDecimal(raw: string): number | null {
  const cleaned = raw.replace(/[\s  ]/g, "").replace(/zł|%/gi, "").replace(",", ".");
  if (cleaned === "" || cleaned === "-") return null;
  if (!/^-?\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Decimal złoty → integer grosze. */
export const zlToGrosze = (zl: number): number => Math.round(zl * 100);
