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
    monthly_activity?: import("@/components/dashboard/MonthlyPaymentChart").MonthlyActivity[];
  };
  top_commitments: {
    id: string;
    display_name: string;
    merchant_name?: string;
    merchant_id?: string | null;
    merchant_domain?: string | null;
    merchant_logo_url?: string | null;
    logo_source?: string | null;
    category: string;
    cadence: string;
    monthly_cost: number | string;
    status: string;
    confidence_band: string;
    payment_rail?: string;
    verification_status?: string;
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
  statement_review_count?: number;
  canonical_merchants_count: number;
  autodebit_rail_distribution?: Record<string, number>;
  ai_audit_score?: number;
  ai_audit_status?: string;
}
