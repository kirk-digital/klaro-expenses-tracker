const VALID_VAT_RATES = new Set(["20", "5", "0", "exempt", "outside_scope"]);

export function parseVatRate(raw: unknown): string | null {
  const v = raw != null ? String(raw).trim() : "";
  if (!v) return null;
  return VALID_VAT_RATES.has(v) ? v : null;
}

export function calculateVat(
  amount: number,
  vatRate: string | null | undefined
): number | null {
  if (!vatRate || vatRate === "exempt" || vatRate === "outside_scope") return null;
  const rate = parseFloat(vatRate) / 100;
  if (Number.isNaN(rate)) return null;
  return parseFloat(((amount * rate) / (1 + rate)).toFixed(2));
}

export function vatRateLabel(rate: string): string {
  const map: Record<string, string> = {
    "20": "20% (Standard)",
    "5": "5% (Reduced)",
    "0": "0% (Zero rated)",
    exempt: "Exempt",
    outside_scope: "Outside scope",
  };
  return map[rate] ?? rate;
}
