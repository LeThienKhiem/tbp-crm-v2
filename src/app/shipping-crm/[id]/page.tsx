"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Anchor,
  ArrowLeft,
  Check,
  CheckCircle,
  FileText,
  MapPin,
  Pencil,
  Ship,
  X,
} from "lucide-react";
import type { DocType, Quote, QuoteStatus, ShippingDocument } from "@/types/shipping";
import {
  printCertificateOfOrigin,
  printCommercialInvoice,
  printOutputInvoice,
  printPackingList,
  printServiceInvoice,
} from "@/lib/printTemplates";

const STATUS_STYLES: Record<QuoteStatus, string> = {
  "Quote Sent": "bg-blue-100 text-blue-700",
  "Booking Confirmed": "bg-yellow-100 text-yellow-700",
  "In Transit": "bg-green-100 text-green-700",
  Delivered: "bg-slate-100 text-slate-600",
};

const TIMELINE_GROUPS = [
  { label: "2–3 Months Before Pickup", docs: ["customer_po"] as DocType[] },
  { label: "1 Week Before Cargo Ready", docs: ["draft_ci", "draft_pl", "eec"] as DocType[] },
  { label: "Day of Pickup", docs: ["final_pl", "input_invoice", "output_invoice"] as DocType[] },
  {
    label: "After Pickup",
    docs: ["service_invoice", "export_decl", "etd_confirmed", "co"] as DocType[],
  },
];

const DOC_LABELS: Record<DocType, string> = {
  customer_po: "Customer PO",
  draft_ci: "Draft Commercial Invoice",
  draft_pl: "Draft Packing List",
  eec: "Signed EEC (TBP + An Thai)",
  final_pl: "Updated Packing List",
  input_invoice: "Input Invoice (An Thai → TBP)",
  output_invoice: "Output Invoice (TBP → Customer)",
  service_invoice: "Service Invoice (TBP → An Thai)",
  export_decl: "Export Declaration + BOL",
  etd_confirmed: "Confirmed ETD from Forwarder",
  co: "Certificate of Origin",
};

const formatUsd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const formatVnd = (n: number) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n) + " VND";

const formatDate = (s: string | null | undefined) => {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return s;
  }
};

function InlineEdit({
  value,
  onSave,
  placeholder = "—",
  className = "",
}: {
  value: string;
  onSave: (v: string) => Promise<void>;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(value);

  useEffect(() => {
    setInput(value);
  }, [value]);

  const handleSave = async () => {
    const trimmed = input.trim();
    await onSave(trimmed);
    setEditing(false);
  };

  const handleCancel = () => {
    setInput(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <span className="flex items-center gap-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          autoFocus
          className="min-w-[120px] rounded border border-slate-300 px-2 py-0.5 text-sm"
        />
        <button type="button" onClick={handleSave} className="text-green-600 hover:text-green-700">
          <Check size={14} />
        </button>
        <button type="button" onClick={handleCancel} className="text-slate-500 hover:text-slate-700">
          <X size={14} />
        </button>
      </span>
    );
  }

  return (
    <span className={`group flex items-center gap-1 ${className}`}>
      {value || placeholder}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Edit"
      >
        <Pencil size={12} className="text-slate-400 hover:text-slate-600" />
      </button>
    </span>
  );
}

export default function ShippingCrmQuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [documents, setDocuments] = useState<ShippingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchQuote = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/shipping/quotes/${id}`);
    const json = await res.json();
    if (json.error || !json.data?.quote) {
      setNotFound(true);
      setQuote(null);
      setDocuments([]);
      return;
    }
    setQuote(json.data.quote);
    setDocuments(json.data.documents ?? []);
    setNotFound(false);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchQuote().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchQuote]);

  const patchQuote = useCallback(
    async (updates: Partial<Quote>) => {
      if (!quote) return;
      const res = await fetch(`/api/shipping/quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!json.error && json.data) setQuote(json.data);
    },
    [id, quote]
  );

  const handleDocToggle = useCallback(
    async (docType: DocType) => {
      const doc = documents.find((d) => d.doc_type === docType);
      if (!doc) return;
      const newStatus = doc.status === "done" ? "pending" : "done";
      setDocuments((prev) =>
        prev.map((d) => (d.doc_type === docType ? { ...d, status: newStatus } : d))
      );
      const res = await fetch(`/api/shipping/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_type: docType, status: newStatus }),
      });
      const json = await res.json();
      if (json.error) {
        setDocuments(documents);
      }
    },
    [id, documents]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (notFound || !quote) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">Quote not found</p>
          <Link
            href="/shipping-crm"
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const doneCount = documents.filter((d) => d.status === "done").length;
  const leg2 = quote.leg2_breakdown;
  const leg1Vnd = quote.leg1_cost_vnd ?? 0;
  const leg2Usd = quote.leg2_total_usd ?? 0;
  const leg3Usd = quote.leg3_estimate_usd ?? 0;

  const generatable: Partial<Record<DocType, () => void>> = {
    draft_ci: () => printCommercialInvoice(quote, true),
    draft_pl: () => printPackingList(quote, true),
    final_pl: () => printPackingList(quote, false),
    output_invoice: () => printOutputInvoice(quote),
    service_invoice: () => printServiceInvoice(quote),
    co: () => printCertificateOfOrigin(quote),
  };

  const fmt = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const TIMELINE_STEPS = [
    {
      key: "order",
      label: "Order Confirmed",
      date: quote.cargo_ready_date ? `Cargo ready: ${fmt(quote.cargo_ready_date)}` : null,
      icon: FileText,
      done: true,
    },
    {
      key: "booking",
      label: "Booking Confirmed",
      date: null,
      icon: Anchor,
      done: ["Booking Confirmed", "In Transit", "Delivered"].includes(quote.status),
    },
    {
      key: "etd",
      label: "Departed (ETD)",
      date: quote.etd ? fmt(quote.etd) : "TBD",
      icon: Ship,
      done: ["In Transit", "Delivered"].includes(quote.status),
    },
    {
      key: "eta",
      label: "Arrived (ETA)",
      date: quote.eta ? fmt(quote.eta) : "TBD",
      icon: MapPin,
      done: quote.status === "Delivered",
    },
    {
      key: "delivered",
      label: "Delivered",
      date: null,
      icon: CheckCircle,
      done: quote.status === "Delivered",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/shipping-crm"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-800">{quote.id}</h1>
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[quote.status]}`}
            >
              {quote.status}
            </span>
            <Link
              href={`/shipping-crm/${quote.id}/edit`}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Pencil size={14} />
              Edit Quote
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Shipment Timeline
          </h2>
          <div className="flex items-start">
            {TIMELINE_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isLast = i === TIMELINE_STEPS.length - 1;
              return (
                <div key={step.key} className="relative flex flex-1 flex-col items-center">
                  {!isLast && (
                    <div
                      className={`absolute left-1/2 top-4 h-0.5 w-full ${
                        step.done ? "bg-blue-500" : "bg-slate-200"
                      }`}
                    />
                  )}
                  <div
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                      step.done
                        ? "bg-blue-600 text-white"
                        : "border-2 border-slate-200 bg-white text-slate-400"
                    }`}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="mt-2 px-1 text-center">
                    <p
                      className={`text-xs font-medium ${
                        step.done ? "text-slate-800" : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.date && (
                      <p className="mt-0.5 text-xs text-slate-400">{step.date}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Customer Info
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Customer Name</p>
                  <p className="text-sm text-slate-800">{quote.customer_name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Contact Email</p>
                  <p className="text-sm text-slate-800">{quote.contact_email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">PO Number</p>
                  <p className="text-sm text-slate-800">{quote.po_number || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Delivery State</p>
                  <p className="text-sm text-slate-800">{quote.delivery_state || "—"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-500">Delivery Address</p>
                  <p className="text-sm text-slate-800">{quote.delivery_address || "—"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Shipment Info
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Origin Port</p>
                  <p className="text-sm text-slate-800">{quote.origin_port || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Destination Port</p>
                  <p className="text-sm text-slate-800">{quote.dest_port || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Container Type</p>
                  <p className="text-sm text-slate-800">{quote.container_type || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Carrier</p>
                  <p className="text-sm text-slate-800">
                    <InlineEdit
                      value={quote.carrier ?? ""}
                      onSave={(v) => patchQuote({ carrier: v || undefined })}
                    />
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">B/L Number</p>
                  <p className="text-sm text-slate-800">
                    <InlineEdit
                      value={quote.bl_number ?? ""}
                      onSave={(v) => patchQuote({ bl_number: v || undefined })}
                    />
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">ETD</p>
                  <p className="text-sm text-slate-800">
                    <InlineEdit
                      value={quote.etd ?? ""}
                      onSave={(v) => patchQuote({ etd: v || undefined })}
                    />
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">ETA</p>
                  <p className="text-sm text-slate-800">
                    <InlineEdit
                      value={quote.eta ?? ""}
                      onSave={(v) => patchQuote({ eta: v || undefined })}
                    />
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Cargo Ready Date</p>
                  <p className="text-sm text-slate-800">{formatDate(quote.cargo_ready_date)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
                3 Legs Breakdown
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-600">Leg 1 – Factory → Hai Phong</span>
                  <span className="font-medium text-slate-800">{formatVnd(leg1Vnd)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-600">Leg 2 – Ocean Freight</span>
                  <span className="font-medium text-slate-800">{formatUsd(leg2Usd)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Leg 3 – US Domestic Trucking</span>
                  <span className="font-medium text-slate-800">{formatUsd(leg3Usd)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Cost Summary
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Leg 1 – Factory → Hai Phong</span>
                  <span>{formatVnd(leg1Vnd)}</span>
                </div>
                <div>
                  <div className="flex justify-between text-slate-600">
                    <span>Leg 2 – Ocean Freight</span>
                    <span>{formatUsd(leg2Usd)}</span>
                  </div>
                  {leg2?.charges && (
                    <details className="mt-1 pl-2">
                      <summary className="cursor-pointer text-xs text-blue-600">
                        expand breakdown
                      </summary>
                      <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
                        <li>Base: {formatUsd(leg2.charges.baseFreight)}</li>
                        <li>BAF: {formatUsd(leg2.charges.baf)}</li>
                        <li>THC Origin: {formatUsd(leg2.charges.thcOrigin)}</li>
                        <li>PSS: {formatUsd(leg2.charges.pss)}</li>
                        {leg2.charges.caf ? <li>CAF: {formatUsd(leg2.charges.caf)}</li> : null}
                        {leg2.charges.thcDestination ? (
                          <li>THC Dest: {formatUsd(leg2.charges.thcDestination)}</li>
                        ) : null}
                      </ul>
                    </details>
                  )}
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Leg 3 – US Domestic Trucking</span>
                  <span>{formatUsd(leg3Usd)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 font-semibold text-slate-800">
                  <div className="flex justify-between">
                    <span>Grand Total</span>
                    <span>{formatUsd(leg2Usd + leg3Usd)} + {formatVnd(leg1Vnd)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Document Checklist
              </h2>
              <div className="mb-4 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all"
                  style={{ width: `${(doneCount / 11) * 100}%` }}
                />
              </div>
              <p className="mb-3 text-xs text-slate-500">
                {doneCount} of 11 documents complete
              </p>
              <div className="space-y-4">
                {TIMELINE_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 text-xs font-medium text-slate-500">{group.label}</p>
                    <div className="space-y-0 border border-slate-100">
                      {group.docs.map((docType) => {
                        const doc = documents.find((d) => d.doc_type === docType);
                        if (!doc) return null;
                        const onGenerate = generatable[doc.doc_type];
                        return (
                          <div
                            key={doc.id}
                            className="flex items-center gap-3 border-b border-slate-100 py-2 last:border-0"
                          >
                            <input
                              type="checkbox"
                              checked={doc.status === "done"}
                              onChange={() => handleDocToggle(doc.doc_type)}
                              className="rounded text-blue-600"
                            />
                            <span
                              className={`flex-1 text-sm ${
                                doc.status === "done"
                                  ? "text-slate-400 line-through"
                                  : "text-slate-700"
                              }`}
                            >
                              {DOC_LABELS[doc.doc_type]}
                            </span>
                            {onGenerate && (
                              <button
                                type="button"
                                onClick={onGenerate}
                                className="rounded px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                              >
                                Generate & Print
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
