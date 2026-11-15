"use client";
import { authFetch } from "@/lib/authFetch";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { inr } from "@/lib/demo-data";
import {
  sampleGraph,
  type GraphData,
  type GraphEdge,
} from "@/lib/workspace-data";
import { useWorkspaceResource } from "@/lib/useWorkspaceResource";
import { getApiBaseUrl } from "@/lib/api";

const kinds: Record<string, { label: string; color: string; icon: string }> = {
  User: { label: "Workspace", color: "#00E0E0", icon: "grid" },
  Account: { label: "Accounts", color: "#3B82F6", icon: "card" },
  Transaction: { label: "Evidence", color: "#8E9CAE", icon: "file" },
  Commitment: { label: "Subscriptions", color: "#FF5500", icon: "repeat" },
  Merchant: { label: "Merchants", color: "#A855F7", icon: "globe" },
  CommitmentInsight: { label: "Insights", color: "#F59E0B", icon: "spark" },
  CancellationEvent: {
    label: "Cancellations",
    color: "#EF4444",
    icon: "shield",
  },
};
const edgeLabels: Record<string, string> = {
  OWNS_ACCOUNT: "owns",
  FUNDS: "funds",
  HAS_COMMITMENT: "commits to",
  ASSOCIATED_WITH: "billed by",
  HAS_INSIGHT: "flagged by",
  SUPPORTED_BY: "evidenced by",
  HAS_TRANSACTION: "debited from",
  PAID_TO: "paid to",
  HAS_CANCELLATION_EVENT: "cancelled via",
  HAS_MERCHANT: "uses",
};
export default function RelationshipExplorer({
  compact = false,
}: {
  compact?: boolean;
}) {
  const resource = useWorkspaceResource<GraphData>(
    "/api/v1/graph/explorer?limit=50",
    sampleGraph,
  );
  const [mode, setMode] = useState("Overview");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const marker = useId().replaceAll(":", "");
  const canvas = useRef<HTMLDivElement>(null);
  const graph = resource.data;
  const model = useMemo(() => {
    if (!graph) return null;
    const categories = [
      ...new Set(graph.nodes.map((n) => n.data.category).filter(Boolean)),
    ].sort() as string[];
    const cids = new Set(
      graph.nodes
        .filter(
          (n) =>
            n.data.node_type === "Commitment" &&
            (category === "All categories" || n.data.category === category),
        )
        .slice(0, compact ? 4 : 100)
        .map((n) => n.data.id),
    );
    const keep = new Set<string>(cids);
    for (const edge of graph.edges)
      if (cids.has(edge.data.source) || cids.has(edge.data.target)) {
        keep.add(edge.data.source);
        keep.add(edge.data.target);
      }
    const txIds = new Set(
      graph.nodes
        .filter(
          (n) => n.data.node_type === "Transaction" && keep.has(n.data.id),
        )
        .map((n) => n.data.id),
    );
    for (const e of graph.edges)
      if (
        e.data.relationship_type === "HAS_TRANSACTION" &&
        txIds.has(e.data.target)
      )
        keep.add(e.data.source);
    graph.nodes
      .filter((n) => n.data.node_type === "User")
      .forEach((n) => keep.add(n.data.id));
    const funding = new Map<string, GraphEdge>();
    const accountsByTx = new Map<string, string>();
    for (const e of graph.edges)
      if (e.data.relationship_type === "HAS_TRANSACTION")
        accountsByTx.set(e.data.target, e.data.source);
    for (const e of graph.edges) {
      if (e.data.relationship_type !== "SUPPORTED_BY") continue;
      const account = accountsByTx.get(e.data.target);
      if (!account || !cids.has(e.data.source)) continue;
      const key = `${account}:funds:${e.data.source}`;
      const previous = funding.get(key);
      funding.set(key, {
        data: {
          id: key,
          source: account,
          target: e.data.source,
          relationship_type: "FUNDS",
          label: "funds",
          metadata: {
            derived: true,
            evidence_count:
              Number(previous?.data.metadata?.evidence_count || 0) + 1,
          },
        },
      });
    }
    const columns = compact
      ? ["Account", "Commitment", "Merchant"]
      : mode === "Evidence"
        ? [
          "User",
          "Account",
          "Transaction",
          "Commitment",
          "Merchant",
          "CommitmentInsight",
          "CancellationEvent",
        ]
        : [
          "User",
          "Account",
          "Commitment",
          "Merchant",
          "CommitmentInsight",
          "CancellationEvent",
        ];
    const nodes = graph.nodes.filter(
      (n) => keep.has(n.data.id) && columns.includes(n.data.node_type),
    );
    const ids = new Set(nodes.map((n) => n.data.id));
    const funded = new Set([...funding.values()].map((e) => e.data.target));
    const edges = [
      ...graph.edges,
      ...(mode !== "Evidence" || compact ? funding.values() : []),
    ].filter(
      (e) =>
        ids.has(e.data.source) &&
        ids.has(e.data.target) &&
        e.data.relationship_type !== "HAS_MERCHANT" &&
        !(
          e.data.relationship_type === "HAS_COMMITMENT" &&
          funded.has(e.data.target) &&
          mode !== "Evidence"
        ),
    );
    const nonemptyColumns = columns.filter((c) =>
      nodes.some((n) => n.data.node_type === c),
    );
    const maxRows = Math.max(
      ...nonemptyColumns.map(
        (c) => nodes.filter((n) => n.data.node_type === c).length,
      ),
      1,
    );
    const height = Math.max(compact ? 295 : 440, maxRows * 78 + 90);
    const width = Math.max(
      compact ? 760 : 1040,
      nonemptyColumns.length * 235 + 30,
    );
    const position = new Map<string, { x: number; y: number }>();
    nonemptyColumns.forEach((kind, ci) => {
      const members = nodes
        .filter((n) => n.data.node_type === kind)
        .sort((a, b) => a.data.name.localeCompare(b.data.name));
      members.forEach((n, i) =>
        position.set(n.data.id, {
          x:
            26 + (ci * (width - 220)) / Math.max(nonemptyColumns.length - 1, 1),
          y: 62 + ((height - 94) * (i + 0.5)) / members.length,
        }),
      );
    });
    return {
      nodes,
      edges,
      width,
      height,
      position,
      categories,
      columns: nonemptyColumns,
    };
  }, [graph, mode, category, compact]);
  const selectedNode = model?.nodes.find((n) => n.data.id === selected);
  useEffect(() => {
    if (query.trim().length < 2 || !model) return;
    const found = model.nodes.find((n) =>
      n.data.name.toLowerCase().includes(query.toLowerCase()),
    );
    const timer = setTimeout(() => {
      const target = Array.from(
        canvas.current?.querySelectorAll<SVGGElement>("[data-node-id]") || [],
      ).find((n) => n.dataset.nodeId === found?.data.id);
      if (!target || !canvas.current) return;
      const rect = target.getBoundingClientRect(),
        viewport = canvas.current.getBoundingClientRect();
      canvas.current.scrollTo({
        left: canvas.current.scrollLeft + rect.left - viewport.left - 50,
        top: canvas.current.scrollTop + rect.top - viewport.top - 100,
      });
    }, 160);
    return () => clearTimeout(timer);
  }, [query, model]);
  const neighbors = useMemo(() => {
    const ids = new Set<string>();
    if (selected) {
      ids.add(selected);
      model?.edges
        .filter((e) => e.data.source === selected || e.data.target === selected)
        .forEach((e) => {
          ids.add(e.data.source);
          ids.add(e.data.target);
        });
    }
    return ids;
  }, [selected, model]);
  const sync = async () => {
    setSyncing(true);
    setSyncMessage("");
    try {
      const response = await authFetch(`${getApiBaseUrl()}/api/v1/graph/sync`, {
        method: "POST",
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok)
        throw new Error(
          "Neo4j sync couldn’t finish. The source records are still available.",
        );
      const result = await response.json();
      setSyncMessage(
        result.status === "success"
          ? `${result.nodes_synced} nodes and ${result.relationships_synced} connections synced.`
          : "Neo4j is disabled. Showing the relational projection.",
      );
      await resource.refresh();
    } catch (e) {
      setSyncMessage(
        e instanceof Error ? e.message : "Sync couldn’t finish. Please retry.",
      );
    } finally {
      setSyncing(false);
    }
  };
  return (
    <section
      className={`relation-explorer ${compact ? "relation-compact" : ""}`}
      aria-label="Payment relationship explorer"
    >
      <div className="relation-heading">
        <div>
          <span className="dash-eyebrow">
            <Icon name="network" size={13} />
            CONNECTED INTELLIGENCE
          </span>
          <h2>
            {compact ? "Follow the money." : "Every payment has a connection."}
          </h2>
          <p>
            {compact
              ? "From the account it leaves to the subscription it supports."
              : "Select a node to see its details and trace the evidence behind a payment."}
          </p>
        </div>
        <span className={`data-source source-${graph?.source || "loading"}`}>
          <i />
          {graph?.source === "neo4j"
            ? "Neo4j connected"
            : graph?.source === "demo"
              ? "Sample graph"
              : graph?.source === "relational"
                ? "Relational projection"
                : "Loading relationships"}
        </span>
      </div>
      {!compact && (
        <div className="relation-toolbar">
          <div className="segmented-control">
            {["Overview", "Evidence"].map((m) => (
              <button
                key={m}
                className={mode === m ? "active" : ""}
                onClick={() => {
                  setMode(m);
                  setSelected(null);
                }}
              >
                {m}
              </button>
            ))}
          </div>
          <label className="relation-search">
            <Icon name="search" size={16} />
            <input
              aria-label="Find a graph node"
              placeholder="Find a subscription or merchant…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="sr-only" htmlFor={`${marker}-category`}>
            Filter graph by category
          </label>
          <select
            id={`${marker}-category`}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSelected(null);
            }}
          >
            <option>All categories</option>
            {model?.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button
            className="icon-button"
            aria-label="Refresh relationships"
            onClick={() => void resource.refresh()}
            disabled={resource.refreshing}
          >
            <Icon name="repeat" size={16} />
          </button>
          {!resource.isDemo && (
            <button
              className="button button-subtle relation-sync"
              onClick={sync}
              disabled={syncing}
            >
              <Icon name="network" size={15} />
              {syncing ? "Syncing…" : "Sync Neo4j"}
            </button>
          )}
        </div>
      )}
      {syncMessage && (
        <div className="dash-notice" role="status">
          {syncMessage}
        </div>
      )}
      {resource.error && (
        <div className="dash-notice" role="alert">
          {resource.error}
          <button onClick={() => void resource.refresh()}>Retry</button>
        </div>
      )}
      {!model ? (
        <div className="relation-loading">
          <Icon name="network" size={27} />
          <span>
            {resource.error
              ? "Relationships couldn’t be loaded."
              : "Connecting the dots…"}
          </span>
        </div>
      ) : !model.nodes.length ? (
        <div className="empty-state">
          <Icon name="network" />
          Import a statement to build your relationship map.
        </div>
      ) : (
        <>
          <div className="relation-body">
            <div
              className="relation-canvas"
              ref={canvas}
              tabIndex={0}
              aria-label="Relationship map. Scroll horizontally or vertically to explore."
            >
              <svg
                viewBox={`0 0 ${model.width} ${model.height}`}
                style={
                  {
                    "--graph-size": `${model.width * zoom}px`,
                    "--graph-zoom": zoom,
                  } as React.CSSProperties
                }
                role="group"
                aria-label={`${model.nodes.length} nodes and ${model.edges.length} labelled connections`}
              >
                <defs>
                  <marker
                    id={`${marker}-arrow`}
                    viewBox="0 0 8 8"
                    refX="7"
                    refY="4"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path
                      d="M0 1 7 4 0 7"
                      fill="none"
                      stroke="#00F0F0"
                      strokeWidth="1.3"
                    />
                  </marker>
                </defs>
                {model.columns.map((c, i) => (
                  <g key={c}>
                    <text
                      x={
                        26 +
                        (i * (model.width - 220)) /
                        Math.max(model.columns.length - 1, 1)
                      }
                      y="25"
                      className="graph-column-heading"
                    >
                      {kinds[c]?.label.toUpperCase()}
                    </text>
                  </g>
                ))}
                {model.edges.map((e) => {
                  const a = model.position.get(e.data.source)!,
                    b = model.position.get(e.data.target)!;
                  const forward = b.x > a.x;
                  const start = a.x + (forward ? 174 : 0),
                    end = b.x + (forward ? 0 : 174);
                  const mid = (start + end) / 2;
                  const dim =
                    !!selected &&
                    !(
                      neighbors.has(e.data.source) &&
                      neighbors.has(e.data.target)
                    );
                  return (
                    <g
                      key={e.data.id}
                      className={`graph-connection ${dim ? "is-dim" : ""}`}
                    >
                      <path
                        d={`M ${start} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${end} ${b.y}`}
                        markerEnd={`url(#${marker}-arrow)`}
                        className={e.data.metadata?.derived ? "is-derived" : ""}
                      />
                      {(!compact || selected) && (
                        <text x={mid} y={(a.y + b.y) / 2 - 7}>
                          {edgeLabels[e.data.relationship_type] || e.data.label}
                        </text>
                      )}
                      <title>
                        {e.data.label}
                        {e.data.metadata?.derived
                          ? ` · derived from ${e.data.metadata.evidence_count} transaction links`
                          : ""}
                      </title>
                    </g>
                  );
                })}
                {model.nodes.map((n) => {
                  const p = model.position.get(n.data.id)!;
                  const kind = kinds[n.data.node_type] || kinds.Merchant;
                  const match =
                    !query ||
                    `${n.data.name} ${n.data.category || ""}`
                      .toLowerCase()
                      .includes(query.toLowerCase());
                  const dim =
                    !match || (!!selected && !neighbors.has(n.data.id));
                  return (
                    <g
                      key={n.data.id}
                      transform={`translate(${p.x},${p.y - 24})`}
                      className={`graph-node-button ${selected === n.data.id ? "is-selected" : ""} ${dim ? "is-dim" : ""}`}
                      tabIndex={0}
                      role="button"
                      data-node-id={n.data.id}
                      aria-label={`${n.data.node_type}: ${n.data.name}`}
                      onClick={() => setSelected(n.data.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(n.data.id);
                        }
                      }}
                      style={
                        { "--node-accent": kind.color } as React.CSSProperties
                      }
                    >
                      <rect width="174" height="48" rx="9" />
                      <circle cx="17" cy="24" r="4" fill={kind.color} />
                      <text x="30" y="21" className="graph-node-title">
                        {n.data.name.length > 19
                          ? n.data.name.slice(0, 18) + "…"
                          : n.data.name}
                      </text>
                      <text x="30" y="36" className="graph-node-subtitle">
                        {n.data.amount !== undefined
                          ? inr(n.data.amount)
                          : n.data.category ||
                          kinds[n.data.node_type]?.label ||
                          n.data.node_type}
                      </text>
                      <title>{n.data.name}</title>
                    </g>
                  );
                })}
              </svg>
            </div>
            {!compact && (
              <aside className="relation-inspector">
                {selectedNode ? (
                  <>
                    <button
                      className="icon-button inspector-close"
                      aria-label="Close node details"
                      onClick={() => setSelected(null)}
                    >
                      <Icon name="close" size={17} />
                    </button>
                    <span className="icon-tile">
                      <Icon
                        name={
                          kinds[selectedNode.data.node_type]?.icon || "network"
                        }
                      />
                    </span>
                    <span className="dash-eyebrow">
                      {kinds[selectedNode.data.node_type]?.label ||
                        selectedNode.data.node_type}
                    </span>
                    <h3>{selectedNode.data.name}</h3>
                    {selectedNode.data.amount !== undefined && (
                      <strong className="inspector-amount">
                        {inr(selectedNode.data.amount)}
                      </strong>
                    )}
                    <dl>
                      {[
                        ["Status", selectedNode.data.status],
                        ["Cadence", selectedNode.data.cadence],
                        ["Category", selectedNode.data.category],
                        ["Confidence", selectedNode.data.confidence_band],
                      ]
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <div key={k}>
                            <dt>{k}</dt>
                            <dd>{v}</dd>
                          </div>
                        ))}
                    </dl>
                    <h4>Connected to</h4>
                    {model.edges
                      .filter(
                        (e) =>
                          e.data.source === selected ||
                          e.data.target === selected,
                      )
                      .map((e) => {
                        const n = model.nodes.find(
                          (n) =>
                            n.data.id ===
                            (e.data.source === selected
                              ? e.data.target
                              : e.data.source),
                        );
                        return (
                          n && (
                            <button
                              className="inspector-connection"
                              key={e.data.id}
                              onClick={() => setSelected(n.data.id)}
                            >
                              <span>
                                {n.data.name}
                                <small>
                                  {edgeLabels[e.data.relationship_type] ||
                                    e.data.label}
                                  {e.data.metadata?.derived ? " · derived" : ""}
                                </small>
                              </span>
                              <Icon name="chevron" size={13} />
                            </button>
                          )
                        );
                      })}
                    <button
                      className="text-link"
                      onClick={() => setSelected(null)}
                    >
                      Clear selection
                    </button>
                  </>
                ) : (
                  <>
                    <span className="inspector-empty-icon">
                      <Icon name="network" size={32} />
                    </span>
                    <h3>See the whole story.</h3>
                    <p>
                      Select any node to inspect its details and highlight its
                      direct connections.
                    </p>
                    <div className="graph-legend">
                      {Object.entries(kinds)
                        .filter(([k]) => model.columns.includes(k))
                        .map(([k, v]) => (
                          <span key={k}>
                            <i style={{ background: v.color }} />
                            {v.label}
                          </span>
                        ))}
                    </div>
                    <p className="graph-derived-note">
                      Dashed “funds” links are derived from account and
                      transaction evidence. Switch to Evidence to see the
                      original paths.
                    </p>
                  </>
                )}
              </aside>
            )}
          </div>
          <div className="relation-footer">
            <span>
              {model.nodes.length} nodes <i /> {model.edges.length} connections
              {graph?.truncated ? " · Limited snapshot" : ""}
            </span>
            {compact ? (
              <Link href="/relationships">
                Explore all relationships <Icon name="arrow" size={14} />
              </Link>
            ) : (
              <div className="graph-zoom">
                <button
                  aria-label="Zoom out"
                  onClick={() => setZoom((z) => Math.max(0.65, z - 0.15))}
                >
                  <Icon name="minus" size={13} />
                </button>
                <button
                  onClick={() => setZoom(1)}
                  aria-label="Reset graph zoom"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  aria-label="Zoom in"
                  onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
                >
                  <Icon name="plus" size={13} />
                </button>
              </div>
            )}
          </div>
          {!compact && (
            <p className="graph-source-note">
              {graph?.message} Dashed funding links are derived from transaction
              evidence; the Evidence view shows the original paths.
              {graph?.last_sync_at
                ? ` Last synced ${new Date(graph.last_sync_at).toLocaleString()}.`
                : ""}
            </p>
          )}
        </>
      )}
    </section>
  );
}
