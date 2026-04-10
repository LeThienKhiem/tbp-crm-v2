"use client";

import { useState, useEffect } from "react";
import {
  Send,
  Eye,
  MessageSquare,
  MousePointerClick,
  DollarSign,
  Target,
  BarChart3,
  TrendingDown,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────
interface AnalyticsData {
  summary: {
    total_sent: number;
    open_rate: number;
    reply_rate: number;
    click_rate: number;
    bounce_rate: number;
    total_leads_generated: number;
    cost_per_lead: number;
    total_spend: number;
  };
  funnel: {
    stage: string;
    count: number;
    conversion_rate: number;
  }[];
  state_breakdown: {
    state: string;
    contacts: number;
    replies: number;
    deals: number;
  }[];
  campaign_comparison: {
    name: string;
    open_rate: number;
    reply_rate: number;
    click_rate: number;
  }[];
}

// ── Funnel stage colors ──────────────────────────────────────────
const FUNNEL_COLORS: Record<string, string> = {
  Contacted: "bg-blue-500",
  Opened: "bg-emerald-500",
  Replied: "bg-green-500",
  Meeting: "bg-amber-500",
  SQL: "bg-orange-500",
  Deal: "bg-red-500",
};

// ── Time range options ───────────────────────────────────────────
type TimeRange = "7d" | "30d" | "90d" | "all";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "all", label: "All Time" },
];

// ── Helpers ──────────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function usd(n: number): string {
  return `$${n.toFixed(2)}`;
}

// ── KPI card config ──────────────────────────────────────────────
interface KpiCard {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  getValue: (s: AnalyticsData["summary"]) => string;
}

const KPI_CARDS: KpiCard[] = [
  {
    label: "TOTAL SENT",
    icon: Send,
    color: "text-slate-600",
    bg: "bg-slate-100",
    getValue: (s) => fmt(s.total_sent),
  },
  {
    label: "OPEN RATE",
    icon: Eye,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    getValue: (s) => pct(s.open_rate),
  },
  {
    label: "REPLY RATE",
    icon: MessageSquare,
    color: "text-blue-600",
    bg: "bg-blue-100",
    getValue: (s) => pct(s.reply_rate),
  },
  {
    label: "CLICK RATE",
    icon: MousePointerClick,
    color: "text-purple-600",
    bg: "bg-purple-100",
    getValue: (s) => pct(s.click_rate),
  },
  {
    label: "COST PER LEAD",
    icon: DollarSign,
    color: "text-amber-600",
    bg: "bg-amber-100",
    getValue: (s) => usd(s.cost_per_lead),
  },
  {
    label: "TOTAL LEADS",
    icon: Target,
    color: "text-green-600",
    bg: "bg-green-100",
    getValue: (s) => fmt(s.total_leads_generated),
  },
];

// ── Component ────────────────────────────────────────────────────
export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  useEffect(() => {
    setLoading(true);
    fetch("/api/marketing-crm/analytics")
      .then((r) => r.json())
      .then((d) => setData(d.data ?? d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  // ── Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-slate-500">Loading analytics...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400">
        <BarChart3 className="h-12 w-12 mb-3" />
        <p className="text-lg font-medium">No analytics data available</p>
        <p className="text-sm">Run some campaigns first to see performance data.</p>
      </div>
    );
  }

  const { summary, funnel, state_breakdown, campaign_comparison } = data;

  // Derived cost metrics
  const repliesCount = funnel.find((f) => f.stage === "Replied")?.count ?? 1;
  const dealsCount = funnel.find((f) => f.stage === "Deal")?.count ?? 1;
  const costPerReply = summary.total_spend / (repliesCount || 1);
  const costPerDeal = summary.total_spend / (dealsCount || 1);

  // Sort state breakdown by contacts descending
  const sortedStates = [...state_breakdown].sort(
    (a, b) => b.contacts - a.contacts
  );

  // Max conversion rate for funnel bar widths
  const maxConversion = funnel.length > 0 ? funnel[0].conversion_rate : 100;

  return (
    <div className="space-y-6">
      {/* ── Header + time range selector ───────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">
            Campaign Analytics
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Performance overview across all outreach campaigns
          </p>
        </div>
        <div className="flex items-center rounded-lg overflow-hidden">
          {TIME_RANGES.map((tr) => (
            <button
              key={tr.value}
              onClick={() => setTimeRange(tr.value)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                timeRange === tr.value
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-300"
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {KPI_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${card.bg}`}
              >
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-800">
                {card.getValue(summary)}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Campaign comparison bar chart ──────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-800 mb-4">
          Campaign Performance Comparison
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={campaign_comparison}
            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
          >
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(1)}%`]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "13px", paddingTop: "8px" }}
            />
            <Bar
              dataKey="open_rate"
              name="Open Rate"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="reply_rate"
              name="Reply Rate"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="click_rate"
              name="Click Rate"
              fill="#a855f7"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Funnel + Cost analysis row ─────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Funnel visualization */}
        <div className="lg:w-[60%] rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-4">
            Conversion Funnel
          </h3>
          <div className="space-y-3">
            {funnel.map((stage) => {
              const widthPct =
                maxConversion > 0
                  ? (stage.conversion_rate / maxConversion) * 100
                  : 0;
              const colorClass =
                FUNNEL_COLORS[stage.stage] ?? "bg-slate-500";

              return (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">
                      {stage.stage}
                    </span>
                    <span className="text-sm text-slate-500">
                      {fmt(stage.count)}{" "}
                      <span className="text-slate-400">
                        ({pct(stage.conversion_rate)})
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-r-lg h-8 overflow-hidden">
                    <div
                      className={`h-8 rounded-r-lg ${colorClass} transition-all duration-500`}
                      style={{ width: `${Math.max(widthPct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cost analysis card */}
        <div className="lg:w-[40%] rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
              <TrendingDown className="h-4 w-4 text-amber-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              Cost Analysis
            </h3>
          </div>
          <div className="space-y-4">
            {[
              { label: "Total Spend", value: usd(summary.total_spend) },
              { label: "Cost per Lead", value: usd(summary.cost_per_lead) },
              { label: "Cost per Reply", value: usd(costPerReply) },
              { label: "Cost per Deal", value: usd(costPerDeal) },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3"
              >
                <span className="text-sm font-medium text-slate-600">
                  {row.label}
                </span>
                <span className="text-lg font-semibold text-slate-800">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── State breakdown table ──────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-800 mb-4">
          Performance by State
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 rounded-tl-lg">State</th>
                <th className="px-4 py-3 text-right">Contacts</th>
                <th className="px-4 py-3 text-right">Replies</th>
                <th className="px-4 py-3 text-right">Deals</th>
                <th className="px-4 py-3 rounded-tr-lg">Reply Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedStates.map((row) => {
                const replyRate =
                  row.contacts > 0
                    ? (row.replies / row.contacts) * 100
                    : 0;
                return (
                  <tr
                    key={row.state}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      {row.state}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">
                      {fmt(row.contacts)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">
                      {fmt(row.replies)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">
                      {fmt(row.deals)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                            style={{
                              width: `${Math.min(replyRate, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-slate-600 min-w-[3rem] text-right">
                          {pct(replyRate)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
