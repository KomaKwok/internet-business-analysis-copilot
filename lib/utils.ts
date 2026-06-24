export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatMoney(value?: number, currency = "USD") {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "Needs verification";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatCompactNumber(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "Needs verification";
  }
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

export function formatPercent(value?: number | null, withSign = false) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "Needs verification";
  }
  const pct = value * 100;
  const sign = withSign && pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function normalizeTicker(input: string) {
  return input.trim().replace(/\s+/g, "").toUpperCase();
}
