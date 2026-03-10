"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { Quote } from "@/types/shipping";

function toDateInputValue(s: string | null | undefined): string {
  if (!s) return "";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function ShippingCrmQuoteEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    customer_name: "",
    contact_email: "",
    po_number: "",
    delivery_state: "",
    delivery_address: "",
    carrier: "",
    bl_number: "",
    etd: "",
    eta: "",
    cargo_ready_date: "",
    leg1_cost_vnd: "" as string | number,
    leg2_total_usd: "" as string | number,
    leg3_estimate_usd: "" as string | number,
  });

  const fetchQuote = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/shipping/quotes/${id}`);
    const json = await res.json();
    if (json.error || !json.data?.quote) {
      setNotFound(true);
      setQuote(null);
      return;
    }
    const q = json.data.quote as Quote;
    setQuote(q);
    setFormData({
      customer_name: q.customer_name ?? "",
      contact_email: q.contact_email ?? "",
      po_number: q.po_number ?? "",
      delivery_state: q.delivery_state ?? "",
      delivery_address: q.delivery_address ?? "",
      carrier: q.carrier ?? "",
      bl_number: q.bl_number ?? "",
      etd: toDateInputValue(q.etd),
      eta: toDateInputValue(q.eta),
      cargo_ready_date: toDateInputValue(q.cargo_ready_date),
      leg1_cost_vnd: q.leg1_cost_vnd ?? "",
      leg2_total_usd: q.leg2_total_usd ?? "",
      leg3_estimate_usd: q.leg3_estimate_usd ?? "",
    });
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

  const update = useCallback(
    <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  async function handleSave() {
    if (!quote) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      customer_name: formData.customer_name.trim() || undefined,
      contact_email: formData.contact_email.trim() || undefined,
      po_number: formData.po_number.trim() || undefined,
      delivery_state: formData.delivery_state.trim() || undefined,
      delivery_address: formData.delivery_address.trim() || undefined,
      carrier: formData.carrier.trim() || undefined,
      bl_number: formData.bl_number.trim() || undefined,
      etd: formData.etd ? new Date(formData.etd).toISOString().slice(0, 10) : undefined,
      eta: formData.eta ? new Date(formData.eta).toISOString().slice(0, 10) : undefined,
      cargo_ready_date: formData.cargo_ready_date
        ? new Date(formData.cargo_ready_date).toISOString().slice(0, 10)
        : undefined,
      leg1_cost_vnd:
        formData.leg1_cost_vnd !== "" && Number(formData.leg1_cost_vnd) >= 0
          ? Number(formData.leg1_cost_vnd)
          : undefined,
      leg2_total_usd:
        formData.leg2_total_usd !== "" && Number(formData.leg2_total_usd) >= 0
          ? Number(formData.leg2_total_usd)
          : undefined,
      leg3_estimate_usd:
        formData.leg3_estimate_usd !== "" && Number(formData.leg3_estimate_usd) >= 0
          ? Number(formData.leg3_estimate_usd)
          : undefined,
    };
    const res = await fetch(`/api/shipping/quotes/${quote.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const { error } = await res.json();
    if (error) {
      alert("Failed to save: " + error);
    } else {
      router.push(`/shipping-crm/${quote.id}`);
    }
    setSaving(false);
  }

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

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link
            href={`/shipping-crm/${quote.id}`}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to quote
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-slate-800">Edit quote – {quote.id}</h1>
        </div>

        <div className="space-y-6">
          {/* Section 1 – Customer & Order Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Customer & Order Info
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Customer Name *</label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => update("customer_name", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  placeholder="Customer name"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Contact Email</label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => update("contact_email", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">PO Number</label>
                <input
                  type="text"
                  value={formData.po_number}
                  onChange={(e) => update("po_number", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  placeholder="PO number"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Delivery State</label>
                <input
                  type="text"
                  value={formData.delivery_state}
                  onChange={(e) => update("delivery_state", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  placeholder="e.g. CA"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Delivery Address</label>
                <input
                  type="text"
                  value={formData.delivery_address}
                  onChange={(e) => update("delivery_address", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  placeholder="Full delivery address"
                />
              </div>
            </div>
          </div>

          {/* Section 2 – Shipment Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Shipment Info
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Origin Port</label>
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  VNHPH (Hai Phong, Vietnam)
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Destination Port</label>
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {quote.dest_port || "—"}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Container Type</label>
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {quote.container_type || "—"}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Carrier</label>
                <input
                  type="text"
                  value={formData.carrier}
                  onChange={(e) => update("carrier", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  placeholder="Carrier name"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">B/L Number</label>
                <input
                  type="text"
                  value={formData.bl_number}
                  onChange={(e) => update("bl_number", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  placeholder="B/L number"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">ETD</label>
                <input
                  type="date"
                  value={formData.etd}
                  onChange={(e) => update("etd", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">ETA</label>
                <input
                  type="date"
                  value={formData.eta}
                  onChange={(e) => update("eta", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Cargo Ready Date</label>
                <input
                  type="date"
                  value={formData.cargo_ready_date}
                  onChange={(e) => update("cargo_ready_date", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Section 3 – Cost Adjustments */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Cost Adjustments
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Leg 1 Cost (VND)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.leg1_cost_vnd}
                  onChange={(e) =>
                    update("leg1_cost_vnd", e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Leg 2 Total (USD)</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={formData.leg2_total_usd}
                  onChange={(e) =>
                    update("leg2_total_usd", e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Editing overrides Freightos estimate.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Leg 3 Estimate (USD)</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={formData.leg3_estimate_usd}
                  onChange={(e) =>
                    update("leg3_estimate_usd", e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <Link
              href={`/shipping-crm/${quote.id}`}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
