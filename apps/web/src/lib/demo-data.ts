export interface DemoSubscription {
  id: string;
  name: string;
  mark: string;
  color: string;
  category: string;
  amount: number;
  day: number;
  account: string;
}
// Sample amounts illustrate the demo; they are not current plan prices.
export const demoSubscriptions: DemoSubscription[] = [
  { id: "netflix", name: "Netflix", mark: "N", color: "#E50914", category: "Entertainment", amount: 649, day: 16, account: "Demo Visa ?? 4242" },
  { id: "prime", name: "Amazon Prime", mark: "A", color: "#00A8E1", category: "Entertainment", amount: 299, day: 18, account: "Demo Visa ?? 4242" },
  { id: "youtube", name: "YouTube Premium", mark: "Y", color: "#FF0000", category: "Entertainment", amount: 129, day: 20, account: "Demo Visa ?? 4242" },
  { id: "chatgpt", name: "ChatGPT Plus", mark: "C", color: "#111111", category: "Productivity", amount: 1999, day: 22, account: "Demo Visa ?? 4242" },
  { id: "claude", name: "Claude Pro", mark: "C", color: "#C87958", category: "Productivity", amount: 1999, day: 24, account: "Demo Visa ?? 4242" },
  { id: "gemini", name: "Gemini Pro", mark: "G", color: "#4285F4", category: "Productivity", amount: 1950, day: 26, account: "Demo Visa ?? 4242" },
];
export const demoMonthly = demoSubscriptions.reduce(
  (sum, sub) => sum + sub.amount,
  0,
);
export const inr = (amount: number | string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
export const demoInsights = [
  { id: "ai-plans", icon: "spark", title: "Review your AI plans together", merchant: "ChatGPT Plus", text: "This sample includes three AI subscriptions. Compare their features and choose the plans that fit your needs.", type: "Review suggested", amount: "Illustrative sample", subId: "chatgpt" },
  { id: "prime-review", icon: "clock", title: "Check before your next renewal", merchant: "Amazon Prime", text: "Review your plan before the next sample payment. Selecting a plan in the simulator does not cancel it.", type: "Review suggested", amount: "Illustrative sample", subId: "prime" },
];
