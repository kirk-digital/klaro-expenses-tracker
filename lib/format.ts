export function formatMoney(amount: number | string, currency: string) {
  const n = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (Number.isNaN(n)) return String(amount);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
