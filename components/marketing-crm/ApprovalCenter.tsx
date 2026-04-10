"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Loader2,
  Mail,
  Megaphone,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";
import type { ApprovalItem, ApprovalType } from "@/types/marketing";

/* ── Type config ───────────────────────────────────────────────── */
const TYPE_META: Record<ApprovalType, { label: string; Icon: typeof User }> = {
  contact: { label: "Contact", Icon: User },
  sequence: { label: "Sequence", Icon: Mail },
  campaign: { label: "Campaign", Icon: Megaphone },
};

const FILTER_TABS: { value: ApprovalType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "contact", label: "Contacts" },
  { value: "sequence", label: "Sequences" },
  { value: "campaign", label: "Campaigns" },
];

/* ── Toast ─────────────────────────────────────────────────────── */
interface Toast {
  message: string;
  type: "success" | "error";
}

function ToastNotification({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg">
      {toast.type === "success" ? (
        <CheckCircle className="h-5 w-5 text-green-600" />
      ) : (
        <XCircle className="h-5 w-5 text-red-600" />
      )}
      <span className="text-sm font-medium text-slate-700">
        {toast.message}
      </span>
      <button
        onClick={onClose}
        className="ml-2 text-slate-400 hover:text-slate-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────── */
export default function ApprovalCenter() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<ApprovalType | "all">("all");
  const [reviewItem, setReviewItem] = useState<{
    item: ApprovalItem;
    action: "approve" | "reject";
  } | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  /* ── Fetch approvals ──────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/marketing-crm/approvals");
        if (!res.ok) throw new Error("Failed to load approvals");
        const json = await res.json();
        const items: ApprovalItem[] = json.data ?? [];
        if (!cancelled) setApprovals(items.filter((a) => a.status === "pending"));
      } catch {
        if (!cancelled) setToast({ message: "Failed to load approvals", type: "error" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Derived data ─────────────────────────────────────────────── */
  const counts = useMemo(() => {
    const c = { contact: 0, sequence: 0, campaign: 0 };
    for (const a of approvals) c[a.type]++;
    return c;
  }, [approvals]);

  const filtered = useMemo(
    () =>
      filterType === "all"
        ? approvals
        : approvals.filter((a) => a.type === filterType),
    [approvals, filterType],
  );

  /* ── Actions ──────────────────────────────────────────────────── */
  const openReview = (item: ApprovalItem, action: "approve" | "reject") => {
    setReviewItem({ item, action });
    setReviewNotes("");
  };

  const closeReview = () => {
    setReviewItem(null);
    setReviewNotes("");
  };

  const confirmReview = useCallback(async () => {
    if (!reviewItem) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/marketing-crm/approvals/${reviewItem.item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: reviewItem.action === "approve" ? "approved" : "rejected",
            reviewer_notes: reviewNotes || null,
          }),
        },
      );
      if (!res.ok) throw new Error("Request failed");

      setApprovals((prev) => prev.filter((a) => a.id !== reviewItem.item.id));
      setToast({
        message: `${reviewItem.item.title} ${reviewItem.action === "approve" ? "approved" : "rejected"}`,
        type: "success",
      });
      closeReview();
    } catch {
      setToast({ message: "Something went wrong. Please try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }, [reviewItem, reviewNotes]);

  /* ── Stat cards config ────────────────────────────────────────── */
  const statCards: { label: string; count: number; Icon: typeof Users }[] = [
    { label: "Pending Contacts", count: counts.contact, Icon: Users },
    { label: "Pending Sequences", count: counts.sequence, Icon: Mail },
    { label: "Pending Campaigns", count: counts.campaign, Icon: Megaphone },
  ];

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <s.Icon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.count}</p>
                <p className="text-sm text-slate-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {FILTER_TABS.map((tab) => {
          const isActive = filterType === tab.value;
          const count =
            tab.value === "all"
              ? approvals.length
              : counts[tab.value as ApprovalType];
          return (
            <button
              key={tab.value}
              onClick={() => setFilterType(tab.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Table / Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-500" />
          <p className="text-sm font-medium text-slate-700">
            No pending approvals
          </p>
          <p className="mt-1 text-xs text-slate-500">
            All items have been reviewed.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Submitted By</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const meta = TYPE_META[item.type];
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                          <meta.Icon className="h-4 w-4 text-slate-400" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {item.title}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {item.submitted_by}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {new Date(item.submitted_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openReview(item, "approve")}
                            className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openReview(item, "reject")}
                            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((item) => {
              const meta = TYPE_META[item.type];
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <meta.Icon className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-medium uppercase text-slate-500">
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.submitted_by} &middot;{" "}
                    {new Date(item.submitted_at).toLocaleDateString()}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => openReview(item, "approve")}
                      className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => openReview(item, "reject")}
                      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Review modal */}
      {reviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {reviewItem.action === "approve" ? "Approve" : "Reject"}{" "}
              {reviewItem.item.title}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {reviewItem.action === "approve"
                ? "This item will be marked as approved and moved forward."
                : "This item will be rejected. Please provide a reason below."}
            </p>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Notes (optional)
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={closeReview}
                disabled={submitting}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              {reviewItem.action === "approve" ? (
                <button
                  onClick={confirmReview}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Confirm Approve
                </button>
              ) : (
                <button
                  onClick={confirmReview}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Confirm Reject
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <ToastNotification toast={toast} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
