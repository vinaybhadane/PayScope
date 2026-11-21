/** Format recorded values without changing their source currency or hiding paise. */
export function formatMoney(amount: number | string, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Number(amount));
}
