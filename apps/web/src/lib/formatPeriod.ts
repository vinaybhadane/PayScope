const periodLabels: Record<string, string> = {
  weekly: "Weekly",
  fortnightly: "Every 2 weeks",
  monthly: "Monthly",
  variable_monthly: "Monthly (varies)",
  quarterly: "Every 3 months",
  annual: "Yearly",
  irregular: "Irregular",
  unknown: "Not known yet",
};

export function formatPeriod(period: string): string {
  return periodLabels[period] ?? period.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}
