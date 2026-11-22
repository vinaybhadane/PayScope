"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatMoney } from "@/lib/formatMoney";

export interface MonthlyActivity {
  month_key: string;
  month_label: string;
  gross_debit: string | number;
  credits: string | number;
  recurring_debit: string | number;
  net_spend: string | number;
}

const series = {
  gross_debit: { label: "Outflow", color: "#ff8957" },
  credits: { label: "Inflow", color: "#5ee0c3" },
  recurring_debit: { label: "Recurring", color: "#a8adff" },
} as const;

const axisFormatter = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });
const monthFormatter = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" });

function calendarIndex(key: string) {
  const [year, month] = key.split("-").map(Number);
  return year * 12 + month - 1;
}

export function MonthlyPaymentChart({ activity, overview = false }: { activity: MonthlyActivity[]; overview?: boolean }) {
  const [duration, setDuration] = useState(6);
  const [metric, setMetric] = useState<keyof typeof series>("gross_debit");
  const [focusedMonth, setFocusedMonth] = useState<string | null>(null);
  const lastMonth = activity.at(-1);
  const end = lastMonth ? calendarIndex(lastMonth.month_key) : 0;
  const start = activity.length ? Math.max(end - duration + 1, calendarIndex(activity[0].month_key)) : 0;
  const visible = activity.filter((item) => calendarIndex(item.month_key) >= start);
  const selected = visible.find((item) => item.month_key === focusedMonth) ?? visible.at(-1);
  const before = selected && visible.find((item) => calendarIndex(item.month_key) === calendarIndex(selected.month_key) - 1);
  const difference = selected && before ? Number(selected[metric]) - Number(before[metric]) : null;
  const largest = Math.max(1, ...visible.map((item) => Number(item[metric])));
  const magnitude = 10 ** Math.floor(Math.log10(largest / 4));
  const step = ([1, 2, 2.5, 5, 10].find((n) => n * magnitude * 4 >= largest) ?? 10) * magnitude;
  const top = step * 4;
  const x = (index: number) => end === start ? 352 : 72 + ((index - start) * 592) / (end - start);
  const points = visible.map((item) => ({
    index: calendarIndex(item.month_key), item,
    x: x(calendarIndex(item.month_key)),
    y: 184 - (Number(item[metric]) / top) * 150,
  }));
  const line = points.map((point, index) => {
    const join = index > 0 && point.index === points[index - 1].index + 1;
    return `${join ? "L" : "M"}${point.x},${point.y}`;
  }).join(" ");
  const { color, label } = series[metric];

  return (
    <section className="dash-panel payment-trend" aria-label="Monthly payment activity">
      <div className="dash-panel-heading">
        <div>
          <h2>Monthly payment activity</h2>
          <p>Successful INR payments grouped by transaction month.</p>
        </div>
        <div className="segmented-control" aria-label="Chart range">
          {[6, 12].map((months) => (
            <button key={months} type="button" className={duration === months ? "active" : ""}
              aria-pressed={duration === months} onClick={() => { setDuration(months); setFocusedMonth(null); }}>
              {months}M
            </button>
          ))}
        </div>
      </div>
      <div className="payment-trend-metrics" aria-label="Payment type">
        {(Object.keys(series) as (keyof typeof series)[]).map((key) => (
          <button key={key} type="button" aria-pressed={metric === key} onClick={() => setMetric(key)}>
            <i style={{ background: series[key].color }} />{series[key].label}
          </button>
        ))}
      </div>
      {selected ? (
        <>
          <div className="timeline-readout" aria-live="polite">
            <strong>{formatMoney(selected[metric])}</strong>
            <span className="timeline-month">{selected.month_label}</span>
            {difference !== null && difference !== 0 && <span className="payment-trend-change">
              {difference > 0 ? "↑" : "↓"} {formatMoney(Math.abs(difference))} vs previous month
            </span>}
          </div>
          <svg className="timeline-svg" viewBox="0 0 704 225" role="group" aria-label={`${label} by month`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                <line x1="66" x2="676" y1={34 + i * 37.5} y2={34 + i * 37.5} stroke="#ffffff16" strokeDasharray="4 5" />
                <text x="0" y={38 + i * 37.5} className="timeline-axis">{axisFormatter.format(top - step * i)}</text>
              </g>
            ))}
            <path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {Array.from({ length: end - start + 1 }, (_, i) => {
              const month = start + i;
              return <text key={month} x={x(month)} y="212" textAnchor="middle" className="timeline-axis">
                {monthFormatter.format(new Date(Date.UTC(Math.floor(month / 12), month % 12, 1)))}
              </text>;
            })}
            {points.map(({ item, x: cx, y: cy }) => (
              <g key={item.month_key} role="button" tabIndex={0}
                aria-label={`${item.month_label} ${label.toLowerCase()}: ${formatMoney(item[metric])}`}
                aria-pressed={selected.month_key === item.month_key}
                onFocus={() => setFocusedMonth(item.month_key)} onMouseEnter={() => setFocusedMonth(item.month_key)}
                onClick={() => setFocusedMonth(item.month_key)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setFocusedMonth(item.month_key); }
                }}>
                {selected.month_key === item.month_key && <line x1={cx} x2={cx} y1="22" y2="184" stroke={color} strokeOpacity=".4" strokeDasharray="3 4" />}
                <rect x={cx - 25} y="16" width="50" height="178" fill="transparent" />
                <circle cx={cx} cy={cy} r={selected.month_key === item.month_key ? 6 : 4} fill={color} stroke="#0d1322" strokeWidth="2" />
              </g>
            ))}
          </svg>
          <div className="timeline-summary">
            <span>{points.length < end - start + 1 ? "Gaps mark months with no recorded payments." : "Amounts are in INR."}</span>
            {overview && <Link href="/financial-impact">Spending analysis <Icon name="arrow" size={14} /></Link>}
          </div>
        </>
      ) : (
        <div className="dash-chart-empty">
          <Icon name="chart" size={28} />
          <p>No completed INR payments to chart yet.</p>
          <Link href="/upload">Import a statement</Link>
        </div>
      )}
    </section>
  );
}
