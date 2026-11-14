import { demoInsights, demoMonthly, demoSubscriptions } from "./demo-data";
export interface GraphNode {
  data: {
    id: string;
    label: string;
    name: string;
    node_type: string;
    amount?: number;
    category?: string;
    status?: string;
    cadence?: string;
    confidence_band?: string;
    metadata?: Record<string, string | number | boolean | null>;
  };
}
export interface GraphEdge {
  data: {
    id: string;
    source: string;
    target: string;
    relationship_type: string;
    label: string;
    metadata?: Record<string, unknown>;
  };
}
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  source: "neo4j" | "relational" | "demo";
  truncated?: boolean;
  last_sync_at?: string;
  message?: string;
}
export interface DashboardData {
  data_status?: string;
  generated_at?: string;
  kpis: {
    active_commitments_count: number;
    monthly_recurring_spend: number | string;
    annualized_recurring_spend: number | string;
    open_insights_count: number;
    potential_annual_savings: number | string;
    cancellations_attention_count: number;
  };
  financial_overview: {
    monthly_recurring_spend: number | string;
    annualized_recurring_spend: number | string;
    upcoming_month_expected: number | string;
    candidate_annual_cost: number | string;
    historical_months: string[];
    historical_amounts: (number | string)[];
  };
  top_commitments: {
    id: string;
    display_name: string;
    merchant_name?: string;
    category: string;
    cadence: string;
    monthly_cost: number | string;
    status: string;
    confidence_band: string;
  }[];
  category_distribution: Record<string, number | string>;
  recent_insights: {
    id: string;
    commitment_id: string;
    commitment_name: string;
    insight_type: string;
    severity: string;
    title: string;
    summary: string;
  }[];
  insight_type_counts: Record<string, number>;
  cancellation_summary: Record<string, number>;
  merchant_review_pending: number;
  canonical_merchants_count: number;
}
export const sampleDashboard: DashboardData = {
  data_status: "demo",
  kpis: {
    active_commitments_count: 8,
    monthly_recurring_spend: demoMonthly,
    annualized_recurring_spend: demoMonthly * 12,
    open_insights_count: 3,
    potential_annual_savings: 7548,
    cancellations_attention_count: 0,
  },
  financial_overview: {
    monthly_recurring_spend: demoMonthly,
    annualized_recurring_spend: demoMonthly * 12,
    upcoming_month_expected: demoMonthly,
    candidate_annual_cost: 0,
    historical_months: [
      "Dec",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
    ],
    historical_amounts: [
      3190,
      3250,
      3490,
      3290,
      3590,
      3390,
      3400,
      3890,
      3680,
      4690,
      4490,
      demoMonthly,
    ],
  },
  top_commitments: demoSubscriptions.map((s) => ({
    id: s.id,
    display_name: s.name,
    merchant_name: s.name,
    category: s.category,
    cadence: "monthly",
    monthly_cost: s.amount,
    status: "active",
    confidence_band: "high",
  })),
  category_distribution: Object.fromEntries(
    ["Productivity", "Entertainment", "Storage"].map((c) => [
      c,
      demoSubscriptions
        .filter((s) => s.category === c)
        .reduce((a, s) => a + s.amount, 0),
    ]),
  ),
  recent_insights: demoInsights.map((i) => ({
    id: i.id,
    commitment_id: i.subId,
    commitment_name: i.merchant,
    insight_type: i.type,
    severity: "medium",
    title: i.title,
    summary: i.text,
  })),
  insight_type_counts: { price_increase: 1, trial_conversion: 1, review: 1 },
  cancellation_summary: {},
  merchant_review_pending: 1,
  canonical_merchants_count: 8,
};
function makeDemoGraph(): GraphData {
  const nodes: GraphNode[] = [
    {
      data: {
        id: "workspace",
        name: "Your workspace",
        label: "Your workspace",
        node_type: "User",
      },
    },
    ...["card", "upi"].map((id) => ({
      data: {
        id,
        name: id === "card" ? "Visa ·· 4242" : "UPI AutoPay",
        label: id === "card" ? "Visa ·· 4242" : "UPI AutoPay",
        node_type: "Account",
      },
    })),
  ];
  const edges: GraphEdge[] = [];
  const edge = (source: string, target: string, type: string) =>
    edges.push({
      data: {
        id: `${source}:${type}:${target}`,
        source,
        target,
        relationship_type: type,
        label: type.toLowerCase().replaceAll("_", " "),
      },
    });
  edge("workspace", "card", "OWNS_ACCOUNT");
  edge("workspace", "upi", "OWNS_ACCOUNT");
  for (const s of demoSubscriptions) {
    nodes.push(
      {
        data: {
          id: s.id,
          name: s.name,
          label: s.name,
          node_type: "Commitment",
          amount: s.amount,
          cadence: "monthly",
          category: s.category,
          status: "active",
          confidence_band: "high",
        },
      },
      {
        data: {
          id: `merchant-${s.id}`,
          name: s.name.split(" ")[0],
          label: s.name.split(" ")[0],
          node_type: "Merchant",
          category: s.category,
        },
      },
      {
        data: {
          id: `tx-${s.id}`,
          name: `${s.name} debit`,
          label: `${s.name} debit`,
          node_type: "Transaction",
          amount: s.amount,
          metadata: {
            transaction_date: `2026-11-${s.day}`,
            payment_channel: s.account.includes("UPI") ? "UPI" : "Card",
          },
        },
      },
    );
    edge("workspace", s.id, "HAS_COMMITMENT");
    edge(s.id, `merchant-${s.id}`, "ASSOCIATED_WITH");
    edge(
      s.account.includes("UPI") ? "upi" : "card",
      `tx-${s.id}`,
      "HAS_TRANSACTION",
    );
    edge(s.id, `tx-${s.id}`, "SUPPORTED_BY");
    edge(`tx-${s.id}`, `merchant-${s.id}`, "PAID_TO");
  }
  for (const i of demoInsights) {
    nodes.push({
      data: {
        id: i.id,
        name: i.type,
        label: i.type,
        node_type: "CommitmentInsight",
        category: i.type,
        status: "open",
      },
    });
    edge(i.subId, i.id, "HAS_INSIGHT");
  }
  return {
    nodes,
    edges,
    source: "demo",
    message:
      "Illustrative relationships from the sample workspace. No live bank data.",
  };
}
export const sampleGraph = makeDemoGraph();
