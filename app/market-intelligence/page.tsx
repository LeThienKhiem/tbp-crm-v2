"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Target,
  FileText,
  ExternalLink,
  Loader2,
  AlertCircle,
  Share2,
  BookmarkPlus,
  Sparkles,
  RefreshCw,
  CheckSquare,
  Square,
  Search,
} from "lucide-react";

const CUSTOM_OPTION = "Custom";

const TOPIC_OPTIONS = [
  { value: "Automotive Expansion & Investments", trending: true },
  { value: "Auto Supply Chain Disruptions", trending: false },
  { value: "Automotive Leadership Changes", trending: false },
  { value: "EV Transition & Tech Upgrades", trending: true },
  { value: CUSTOM_OPTION, trending: false },
] as const;

const MAX_RECENT_CUSTOM = 3;

type OpportunityVariant = "high" | "medium" | "low";

type Article = {
  id: string;
  publishedAt: string;
  source: string;
  title: string;
  snippet: string;
  url: string;
  image?: string | null;
};

type ApiResponse = {
  opportunity_level: string;
  sales_action_plan: string[];
  articles: Article[];
};

const OPPORTUNITY_VARIANT_MAP: Record<string, OpportunityVariant> = {
  High: "high",
  Medium: "medium",
  Low: "low",
};

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function OpportunityBadge({ label, variant }: { label: string; variant: OpportunityVariant }) {
  const isHigh = variant === "high";
  const styles = {
    high:
      "bg-emerald-50 text-emerald-800 ring-2 ring-emerald-400/60 shadow-lg shadow-emerald-200/50 " +
      (isHigh ? "animate-pulse" : ""),
    medium: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
    low: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-inset ${styles[variant]}`}
    >
      {isHigh && <span className="text-lg" aria-hidden>🔥</span>}
      <Target className="h-4 w-4 shrink-0" />
      {isHigh ? "High Priority" : label}
    </span>
  );
}

function NewsCard({
  publishedAt,
  source,
  title,
  snippet,
  url,
  image,
}: {
  publishedAt: string;
  source: string;
  title: string;
  snippet: string;
  url: string;
  image?: string | null;
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col p-4 sm:flex-row sm:gap-4">
        {image && (
          <div className="mb-3 shrink-0 sm:mb-0 sm:w-24">
            <img
              src={image}
              alt=""
              className="h-24 w-full rounded-lg object-cover sm:h-20 sm:w-24"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-500">
            <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
            <span aria-hidden className="text-slate-300">·</span>
            <span className="font-medium text-slate-600">{source}</span>
          </div>
          <h3 className="mb-2 text-base font-bold leading-snug text-slate-900">{title}</h3>
          <p className="mb-4 text-sm leading-relaxed text-slate-600 line-clamp-3">{snippet || "—"}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
        >
          Read Source
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share to Team
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <BookmarkPlus className="h-3.5 w-3.5" />
          Save to Leads
        </button>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 h-20 w-full animate-pulse rounded-lg bg-slate-200" />
      <div className="mb-2 h-3 w-24 animate-pulse rounded bg-slate-200" />
      <div className="mb-2 h-4 w-16 animate-pulse rounded bg-slate-200" />
      <div className="mb-2 h-5 w-full animate-pulse rounded bg-slate-200" />
      <div className="mb-2 h-4 w-full animate-pulse rounded bg-slate-200" />
      <div className="h-9 w-28 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

export default function MarketIntelligencePage() {
  const [topic, setTopic] = useState<string>(TOPIC_OPTIONS[0].value);
  const [customInput, setCustomInput] = useState("");
  const [recentCustomSearches, setRecentCustomSearches] = useState<string[]>([]);
  const [lastSearchedTopic, setLastSearchedTopic] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedPlan, setCheckedPlan] = useState<Record<number, boolean>>({});

  const fetchData = useCallback(async (requestedTopic: string) => {
    const topicToSend = requestedTopic.trim();
    if (!topicToSend) return;
    setLoading(true);
    setError(null);
    try {
      const url = `/api/market-intelligence?topic=${encodeURIComponent(topicToSend)}`;
      const res = await fetch(url);
      const json = await res.json();
      console.log("Frontend received data:", json);
      if (json.error) {
        setError(json.error);
        return;
      }
      setLastSearchedTopic(topicToSend);
      const opportunityLevel =
        json.opportunity_level != null && String(json.opportunity_level).trim()
          ? String(json.opportunity_level).trim()
          : "Evaluating...";
      setData({
        opportunity_level: opportunityLevel,
        sales_action_plan: Array.isArray(json.sales_action_plan) ? json.sales_action_plan : [],
        articles: Array.isArray(json.articles) ? json.articles : [],
      });
      setCheckedPlan({});
      const isPreset = TOPIC_OPTIONS.some((o) => o.value !== CUSTOM_OPTION && o.value === topicToSend);
      if (!isPreset) {
        setRecentCustomSearches((prev) => {
          const next = [topicToSend, ...prev.filter((t) => t !== topicToSend)].slice(0, MAX_RECENT_CUSTOM);
          return next;
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load market intelligence.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const selectedTopic = topic;
    if (selectedTopic !== CUSTOM_OPTION) {
      fetchData(selectedTopic);
    }
  }, [topic, fetchData]);

  const handleCustomSearch = () => {
    const q = customInput.trim();
    if (q) fetchData(q);
  };

  const opportunityVariant = data
    ? (OPPORTUNITY_VARIANT_MAP[data.opportunity_level] ?? "medium")
    : "medium";
  const opportunityLabel = data?.opportunity_level ?? "Evaluating...";
  const actionPlanPoints = data?.sales_action_plan ?? [];
  const articles = data?.articles ?? [];

  const togglePlanItem = (i: number) => {
    setCheckedPlan((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Portal
        </Link>

        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Module 07: Market Intelligence
          </h1>
          <p className="mt-1 text-sm text-slate-600 md:text-base">
            Real-time Automotive Industry Trends & AI Sentiment
          </p>
        </header>

        {/* Topic filter + Custom input + Refresh */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
            <div className="flex-1">
              <label htmlFor="topic-filter" className="mb-2 block text-sm font-medium text-slate-700">
                Topic
              </label>
              <select
                id="topic-filter"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                {TOPIC_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value}
                    {opt.trending ? " — Trending" : ""}
                  </option>
                ))}
              </select>
            </div>
            {topic === CUSTOM_OPTION && (
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label htmlFor="custom-topic-input" className="sr-only">
                    Custom topic
                  </label>
                  <input
                    id="custom-topic-input"
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCustomSearch()}
                    placeholder="e.g., Toyota expansion, EV battery shortages..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCustomSearch}
                  disabled={loading || !customInput.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                  aria-label="Search custom topic"
                >
                  <Search className="h-4 w-4" />
                  Search
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                const toFetch = topic === CUSTOM_OPTION ? (lastSearchedTopic || customInput.trim()) : topic;
                if (toFetch) fetchData(toFetch);
              }}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh News
            </button>
          </div>
          {topic === CUSTOM_OPTION && recentCustomSearches.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Recent custom searches:</span>
              {recentCustomSearches.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setCustomInput(q);
                    fetchData(q);
                  }}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading: Gemini analyzing state */}
        {loading && (
          <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                <Sparkles className="absolute -right-1 -top-1 h-5 w-5 text-amber-400" />
              </div>
              <p className="text-center text-sm font-medium text-slate-700">
                Gemini is analyzing market trends…
              </p>
              <p className="text-center text-xs text-slate-500">
                Fetching news and generating your sales action plan.
              </p>
            </div>
          </section>
        )}

        {/* Sales strategy first on mobile (order: action plan card, then opportunity, then news) */}
        {!loading && (error || data) && (
          <section className="mb-8 space-y-6">
            {/* Mobile: Action Plan pinned first (order-1); desktop: same order */}
            <div className="order-1 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 md:px-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                  {lastSearchedTopic ? (
                    <>AI Strategy for {lastSearchedTopic}</>
                  ) : (
                    "Actionable Sales Plan"
                  )}
                </h2>
              </div>
              <div className="p-4 md:p-6">
                {error ? (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <AlertCircle className="h-10 w-10 text-red-500" />
                    <p className="text-center text-sm text-red-600">{error}</p>
                  </div>
                ) : actionPlanPoints.length > 0 ? (
                  <ul className="space-y-3">
                    {actionPlanPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => togglePlanItem(i)}
                          className="mt-0.5 shrink-0 rounded border border-slate-300 p-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label={checkedPlan[i] ? "Uncheck" : "Check"}
                        >
                          {checkedPlan[i] ? (
                            <CheckSquare className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <Square className="h-5 w-5 text-slate-400" />
                          )}
                        </button>
                        <span
                          className={`flex-1 text-sm leading-relaxed text-slate-700 md:text-base ${
                            checkedPlan[i] ? "text-slate-400 line-through" : ""
                          }`}
                        >
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No sales plan available.</p>
                )}
              </div>
            </div>

            {/* Sales Opportunity Level (after Action Plan on mobile) */}
            {!error && data && (
              <div className="order-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Sales Opportunity Level
                </h2>
                <div className="mb-3">
                  <OpportunityBadge label={opportunityLabel} variant={opportunityVariant} />
                </div>
                <p className="text-sm leading-relaxed text-slate-600">
                  B2B sales opportunity for this topic, derived by AI from current headlines.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Latest News */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Latest News</h2>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
              News could not be loaded. Try refreshing or check your connection.
            </div>
          ) : articles.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <NewsCard
                  key={article.id}
                  publishedAt={article.publishedAt}
                  source={article.source}
                  title={article.title}
                  snippet={article.snippet}
                  url={article.url}
                  image={article.image}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
              No articles found for this topic.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
