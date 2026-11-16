const periodLabels: Record<string, string> = {
  weekly: "Weekly",
  fortnightly: "Every 2 weeks",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  variable_monthly: "Monthly (varies)",
  quarterly: "Every 3 months",
  annual: "Yearly",
  annually: "Yearly",
  yearly: "Yearly",
  irregular: "Irregular",
  unknown: "Not known yet",
};

export function formatPeriod(period: string | null | undefined): string {
  if (!period) return "—";
  const clean = period.toLowerCase().trim();
  return periodLabels[clean] ?? period.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}
