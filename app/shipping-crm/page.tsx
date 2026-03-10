"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  Clock,
  FileText,
  Plus,
  Ship,
} from "lucide-react";
import type { QuoteStatus } from "@/types/shipping";
import { ZipDeliveryInput } from "@/components/shipping-crm/ZipDeliveryInput";

type QuoteRow = {
  id: string;
  customer_name: string;
  origin_port: string;
  dest_port: string;
  container_type: string;
  carrier?: string | null;
  leg2_total_usd?: number | null;
  leg3_estimate_usd?: number | null;
  cargo_ready_date?: string | null;
  status: QuoteStatus;
  docs_done: number;
};

const STATUS_OPTIONS: QuoteStatus[] = [
  "Quote Sent",
  "Booking Confirmed",
  "In Transit",
  "Delivered",
];

const STATUS_STYLES: Record<QuoteStatus, string> = {
  "Quote Sent": "bg-blue-100 text-blue-700",
  "Booking Confirmed": "bg-yellow-100 text-yellow-700",
  "In Transit": "bg-green-100 text-green-700",
  Delivered: "bg-slate-100 text-slate-600",
};

function DocsPill({ done }: { done: number }) {
  const color =
    done === 11
      ? "bg-green-100 text-green-700"
      : done >= 7
        ? "bg-yellow-100 text-yellow-700"
        : "bg-red-100 text-red-700";
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${color}`}>
      {done}/11
    </span>
  );
}

const formatUsd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const formatDate = (s: string | null | undefined) => {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return s;
  }
};

export default function ShippingCrmPage() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusTab, setStatusTab] = useState<QuoteStatus | "All">("All");

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/shipping/quotes")
      .then((r) => r.json())
      .then((json: { data: QuoteRow[] | null; error: string | null }) => {
        if (cancelled) return;
        if (json.error) throw new Error(json.error);
        setQuotes(json.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setQuotes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredQuotes = useMemo(() => {
    let list = quotes;
    if (statusTab !== "All") {
      list = list.filter((q) => q.status === statusTab);
    }
    if (searchDebounced) {
      const lower = searchDebounced.toLowerCase();
      list = list.filter(
        (q) =>
          q.id.toLowerCase().includes(lower) ||
          (q.customer_name && q.customer_name.toLowerCase().includes(lower))
      );
    }
    return list;
  }, [quotes, statusTab, searchDebounced]);

  const handleStatusChange = useCallback(
    async (id: string, newStatus: string) => {
      const prev = quotes.map((q) => (q.id === id ? { ...q, status: newStatus as QuoteStatus } : q));
      setQuotes(prev);
      const res = await fetch(`/api/shipping/quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.error) {
        setQuotes(quotes);
      }
    },
    [quotes]
  );

  const totalQuotes = quotes.length;
  const inTransit = quotes.filter((q) => q.status === "In Transit").length;
  const quoteSent = quotes.filter((q) => q.status === "Quote Sent").length;
  const pendingDocs = quotes.filter((q) => (q.docs_done ?? 0) < 11).length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Shipping CRM</h1>
            <p className="mt-0.5 text-sm text-slate-500">All DDP quotes and shipment tracking</p>
          </div>
          <Link
            href="/market-radar"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} /> New Quote
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Total Quotes</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-blue-600">{totalQuotes}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Ship className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">In Transit</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-green-600">{inTransit}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Quote Sent</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-yellow-600">{quoteSent}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Pending Docs</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-red-600">{pendingDocs}</p>
          </div>
        </div>

        {/* Task 3 test: ZipDeliveryInput — remove after verify */}
        <div className="mb-6 rounded-xl border border-dashed border-slate-300 bg-white p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            ZipDeliveryInput test
          </p>
          <ZipDeliveryInput
            portCode="USLAX"
            containerType="40HC"
            onRateCalculated={(result) => console.log("Rate result:", result)}
          />
        </div>

        <div className="mb-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Search by Quote ID or Customer Name"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="min-h-[40px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400"
          />
          <div className="flex gap-1 border-b border-slate-200">
            {(["All", ...STATUS_OPTIONS] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusTab(tab)}
                className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  statusTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="divide-y divide-slate-100">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
                  <div className="h-5 flex-1 animate-pulse rounded bg-slate-200" />
                  <div className="h-5 w-20 animate-pulse rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <FileText className="mx-auto mb-3 opacity-30" size={40} />
              <p>No quotes found</p>
              <Link
                href="/market-radar"
                className="mt-2 block text-sm text-blue-600 underline"
              >
                Go to Market Radar to create a quote
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Quote ID</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3">Container</th>
                    <th className="px-4 py-3">Carrier</th>
                    <th className="px-4 py-3 text-right">Total Cost</th>
                    <th className="px-4 py-3">Cargo Ready</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Docs</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredQuotes.map((q) => {
                    const leg2 = q.leg2_total_usd ?? 0;
                    const leg3 = q.leg3_estimate_usd ?? 0;
                    const totalCost = leg2 + leg3;
                    return (
                      <tr key={q.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/shipping-crm/${q.id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {q.id}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-800">{q.customer_name || "—"}</td>
                        <td className="font-mono text-xs text-slate-600">
                          {q.origin_port} → {q.dest_port}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {q.container_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{q.carrier ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">
                          {formatUsd(totalCost)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(q.cargo_ready_date)}</td>
                        <td className="px-4 py-3">
                          <span className={`relative inline-block rounded-full ${STATUS_STYLES[q.status]}`}>
                            <select
                              value={q.status}
                              onChange={(e) => handleStatusChange(q.id, e.target.value)}
                              className="relative z-10 cursor-pointer appearance-none rounded-full border-0 bg-transparent py-1 pl-2.5 pr-6 text-xs font-medium outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 [color:inherit]"
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-70" />
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <DocsPill done={q.docs_done ?? 0} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            href={`/shipping-crm/${q.id}`}
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
