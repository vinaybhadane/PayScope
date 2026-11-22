/** Format recorded values without changing their source currency or hiding paise. */
export function formatMoney(amount: number | string | null, currency = "INR") {
  if (amount === null) return "—";
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  const decimal = typeof amount === "string" && /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
  if (decimal) {
    const [, sign, whole, fractional = ""] = decimal;
    const integer = BigInt(whole);
    const value = sign ? (integer === BigInt(0) ? -0 : -integer) : integer;
    return formatter.formatToParts(value).map((part) => part.type === "fraction" ? fractional.padEnd(2, "0") : part.value).join("");
  }
  return formatter.format(Number(amount));
}
