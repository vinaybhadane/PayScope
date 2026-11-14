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
export const demoSubscriptions: DemoSubscription[] = [
  {
    id: "netflix", name: "Netflix Premium", mark: "N", color: "#E50914",
    category: "Entertainment",
    amount: 649,
    day: 16,
    account: "Visa ·· 4242",
  },
  {
    id: "spotify", name: "Spotify Premium", mark: "≈", color: "#1DB954",
    category: "Entertainment",
    amount: 119,
    day: 18,
    account: "UPI AutoPay",
  },
  {
    id: "adobe", name: "Adobe Creative Cloud", mark: "A", color: "#FF0000",
    category: "Productivity",
    amount: 1699,
    day: 21,
    account: "Visa ·· 4242",
  },
  {
    id: "notion", name: "Notion Plus", mark: "N", color: "#CBD5E1",
    category: "Productivity",
    amount: 330,
    day: 24,
    account: "Visa ·· 4242",
  },
  {
    id: "icloud", name: "iCloud+", mark: "☁", color: "#0284C7",
    category: "Storage",
    amount: 75,
    day: 25,
    account: "Visa ·· 4242",
  },
  {
    id: "youtube", name: "YouTube Premium", mark: "▶", color: "#FF0000",
    category: "Entertainment",
    amount: 129,
    day: 26,
    account: "UPI AutoPay",
  },
  {
    id: "figma", name: "Figma Professional", mark: "F", color: "#A259FF",
    category: "Productivity",
    amount: 990,
    day: 27,
    account: "Visa ·· 4242",
  },
  {
    id: "prime", name: "Amazon Prime", mark: "a", color: "#00A8E1",
    category: "Entertainment",
    amount: 299,
    day: 28,
    account: "UPI AutoPay",
  },
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
  {
    id: "adobe-price",
    icon: "trend",
    title: "A price increase worth reviewing",
    merchant: "Adobe Creative Cloud",
    text: "Your monthly payment moved from ₹1,499 to ₹1,699. That’s an extra ₹2,400 over a year.",
    type: "Price increase",
    amount: "₹2,400 / year",
    subId: "adobe",
  },
  {
    id: "notion-review",
    icon: "clock",
    title: "Does this still earn its place?",
    merchant: "Notion Plus",
    text: "A recurring charge worth checking. Review whether this plan still fits your needs before the next renewal.",
    type: "Review suggested",
    amount: "₹3,960 / year",
    subId: "notion",
  },
  {
    id: "trial",
    icon: "repeat",
    title: "Keep an eye on your renewal",
    merchant: "Figma Professional",
    text: "This sample illustrates a trial converting to a monthly subscription. Check your plan before the next charge.",
    type: "Trial conversion",
    amount: "₹990 / month",
    subId: "figma",
  },
];
