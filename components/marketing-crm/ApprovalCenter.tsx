"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  GitBranch,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Megaphone,
  User,
  Users,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import EmailPreview from "./EmailPreview";
import type {
  ApprovalItem,
  ApprovalType,
  SequenceTypeId,
} from "@/types/marketing";

/* ── Config ───────────────────────────────────────────────────── */
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

const SEQ_TYPE_META: Record<SequenceTypeId, { label: string; tool: string; badge: string }> = {
  cold_instantly: { label: "Cold Outreach", tool: "Instantly.ai", badge: "bg-blue-50 text-blue-700 ring-blue-300" },
  priority_instantly: { label: "Priority Outreach", tool: "Instantly.ai", badge: "bg-blue-50 text-blue-700 ring-blue-300" },
  nurture_instantly: { label: "Warm Nurture", tool: "Instantly.ai", badge: "bg-blue-50 text-blue-700 ring-blue-300" },
};

const SEGMENT_LABELS: Record<string, string> = {
  distributors: "Distributors",
  private_label: "Private Label",
  top_50_priority: "Top 50 Priority",
  custom: "Custom List",
};

/* ── Toast ─────────────────────────────────────────────────────── */
interface Toast { message: string; type: "success" | "error"; }

function ToastNotification({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg">
      {toast.type === "success" ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
      <span className="text-sm font-medium text-slate-700">{toast.message}</span>
      <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
    </div>
  );
}

/* ── Sequence Detail Panel ─────────────────────────────────────── */
function SequenceApprovalDetail({ item }: { item: ApprovalItem }) {
  const [expanded, setExpanded] = useState(false);
  const detail = item.sequence_detail;
  if (!detail) return null;

  const meta = SEQ_TYPE_META[detail.sequence_type] ?? SEQ_TYPE_META.cold_instantly;

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      {/* Type + Tool */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${meta.badge}`}>
          <Zap size={10} /> {meta.label} — {meta.tool}
        </span>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <Lock size={10} className="text-amber-500" /> outreach.tbpauto.com
        </span>
      </div>

      {/* Targeting */}
      <div className="mb-3 grid gap-2 text-xs sm:grid-cols-3">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Users size={12} className="text-slate-400" />
          <span className="font-medium">{detail.estimated_contacts} contacts</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <MapPin size={12} className="text-slate-400" />
          <span>{detail.target_segments.map((s) => SEGMENT_LABELS[s] ?? s).join(", ")}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <MapPin size={12} className="text-slate-400" />
          <span>{detail.target_states.join(", ")}</span>
        </div>
      </div>

      {/* Steps preview */}
      <button onClick={() => setExpanded(!expanded)}
        className="mb-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? "Hide" : "Preview"} {detail.steps.length} steps
      </button>

      {expanded && (
        <div className="space-y-2">
          {detail.steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              {step.type === "email" && <Mail size={14} className="mt-0.5 shrink-0 text-blue-500" />}
              {step.type === "wait" && <Clock size={14} className="mt-0.5 shrink-0 text-amber-500" />}
              {step.type === "condition" && <GitBranch size={14} className="mt-0.5 shrink-0 text-purple-500" />}
              <div className="min-w-0">
                {step.type === "email" && (
                  <>
                    <p className="truncate text-xs font-medium text-slate-800">{step.subject || "(no subject)"}</p>
                    <p className="line-clamp-2 text-xs text-slate-500">{step.body?.slice(0, 120)}...</p>
                  </>
                )}
                {step.type === "wait" && <p className="text-xs text-slate-600">Wait {step.wait_days} days</p>}
                {step.type === "condition" && <p className="text-xs text-slate-600">Condition: {step.condition?.replace(/_/g, " ")}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Campaign Detail Panel ─────────────────────────────────────── */
function CampaignApprovalDetail({ item }: { item: ApprovalItem }) {
  const [expanded, setExpanded] = useState(false);
  const detail = item.sequence_detail;

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-300">
          <Megaphone size={10} /> Instantly Campaign
        </span>
        <span className="text-xs text-slate-500">
          Synced from Instantly.ai
        </span>
      </div>

      <p className="text-xs text-slate-600">{item.description}</p>

      {detail && (detail as { steps?: unknown[] }).steps && (
        <>
          <button onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? "Hide" : "Preview"} {((detail as { steps?: unknown[] }).steps ?? []).length} email steps
          </button>

          {expanded && (
            <div className="mt-2 space-y-2">
              {((detail as { steps?: { type: string; subject?: string; body?: string; wait_days?: number; variants?: { subject: string; body: string }[] }[] }).steps ?? []).map((step, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-start gap-2">
                    {step.wait_days ? (
                      <Clock size={14} className="mt-0.5 shrink-0 text-amber-500" />
                    ) : (
                      <Mail size={14} className="mt-0.5 shrink-0 text-blue-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      {step.wait_days ? (
                        <p className="text-xs text-slate-600">Wait {step.wait_days} day(s) before next step</p>
                      ) : null}
                      {step.subject && (
                        <p className="truncate text-xs font-medium text-slate-800">Subject: {step.subject}</p>
                      )}
                      {step.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{step.body.replace(/<[^>]*>/g, "").slice(0, 200)}</p>
                      )}
                      {step.variants && step.variants.length > 1 && (
                        <p className="mt-1 text-xs text-purple-600">{step.variants.length} A/B variants</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────── */
export default function ApprovalCenter() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<ApprovalType | "all">("all");
  const [reviewItem, setReviewItem] = useState<{ item: ApprovalItem; action: "approve" | "reject" } | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [previewItem, setPreviewItem] = useState<ApprovalItem | null>(null);

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
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => {
    const c = { contact: 0, sequence: 0, campaign: 0 };
    for (const a of approvals) c[a.type]++;
    return c;
  }, [approvals]);

  const filtered = useMemo(
    () => filterType === "all" ? approvals : approvals.filter((a) => a.type === filterType),
    [approvals, filterType],
  );

  const openReview = (item: ApprovalItem, action: "approve" | "reject") => { setReviewItem({ item, action }); setReviewNotes(""); };
  const closeReview = () => { setReviewItem(null); setReviewNotes(""); };

  const confirmReview = useCallback(async () => {
    if (!reviewItem) return;
    setSubmitting(true);
    const newStatus = reviewItem.action === "approve" ? "approved" : "rejected";
    try {
      // 1. Update approval status
      const res = await fetch(`/api/marketing-crm/approvals`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reviewItem.item.id, status: newStatus, reviewer_notes: reviewNotes || null }),
      });
      if (!res.ok) throw new Error("Request failed");

      // 2. If it's a sequence approval, also update the sequence status
      if (reviewItem.item.type === "sequence" && reviewItem.item.reference_id) {
        try {
          const seqRes = await fetch("/api/marketing-crm/sequences");
          if (seqRes.ok) {
            const seqJson = await seqRes.json();
            const seq = (seqJson.data ?? []).find((s: { id: string }) => s.id === reviewItem.item.reference_id);
            if (seq) {
              await fetch("/api/marketing-crm/sequences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...seq,
                  status: newStatus === "approved" ? "approved" : "draft",
                  approved_by: newStatus === "approved" ? "Thomas" : null,
                  approved_at: newStatus === "approved" ? new Date().toISOString() : null,
                }),
              });
            }
          }
        } catch {
          // Non-critical: sequence status update failed
        }
      }

      // 3. If it's a campaign approval from Instantly, log the decision
      // (Campaign stays as-is on Instantly — approval is for internal tracking)
      if (reviewItem.item.type === "campaign" && reviewItem.item.reference_id) {
        // No action needed on Instantly side — approval is for internal CRM tracking
        // The campaign status on Instantly is managed directly in Instantly.ai
      }

      setApprovals((prev) => prev.filter((a) => a.id !== reviewItem.item.id));
      setToast({ message: `${reviewItem.item.title} ${reviewItem.action === "approve" ? "approved" : "rejected"}`, type: "success" });
      closeReview();
    } catch {
      setToast({ message: "Something went wrong. Please try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }, [reviewItem, reviewNotes]);

  const statCards: { label: string; count: number; Icon: typeof Users; iconBg: string; accent: string }[] = [
    { label: "Pending Contacts", count: counts.contact, Icon: Users, iconBg: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400", accent: "border-l-violet-400" },
    { label: "Pending Sequences", count: counts.sequence, Icon: Mail, iconBg: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400", accent: "border-l-sky-400" },
    { label: "Pending Campaigns", count: counts.campaign, Icon: Megaphone, iconBg: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400", accent: "border-l-orange-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map((s) => (
          <div key={s.label} className={`rounded-xl border-l-4 ${s.accent} border border-slate-200 bg-white p-4 shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.iconBg}`}>
                <s.Icon className="h-5 w-5" />
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
          const count = tab.value === "all" ? approvals.length : counts[tab.value as ApprovalType];
          return (
            <button key={tab.value} onClick={() => setFilterType(tab.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}>
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
          <p className="text-sm font-medium text-slate-700">No pending approvals</p>
          <p className="mt-1 text-xs text-slate-500">All items have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const meta = TYPE_META[item.type];
            return (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <meta.Icon className="h-4 w-4 text-slate-400" />
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{meta.label}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Submitted by {item.submitted_by} &middot; {new Date(item.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.type === "sequence" && item.sequence_detail && (
                      <button onClick={() => setPreviewItem(item)}
                        className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">
                        <Eye className="h-3.5 w-3.5" /> Preview
                      </button>
                    )}
                    <button onClick={() => openReview(item, "approve")}
                      className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700">
                      Approve
                    </button>
                    <button onClick={() => openReview(item, "reject")}
                      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700">
                      Reject
                    </button>
                  </div>
                </div>

                {/* Rich detail panels */}
                {item.type === "sequence" && item.sequence_detail && (
                  <SequenceApprovalDetail item={item} />
                )}
                {item.type === "campaign" && (
                  <CampaignApprovalDetail item={item} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review modal */}
      {reviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {reviewItem.action === "approve" ? "Approve" : "Reject"} {reviewItem.item.title}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {reviewItem.action === "approve"
                ? "This item will be marked as approved and moved forward."
                : "This item will be rejected. Please provide a reason below."}
            </p>

            {/* Show detail in review modal */}
            {reviewItem.item.type === "sequence" && reviewItem.item.sequence_detail && (
              <div className="mt-3">
                <SequenceApprovalDetail item={reviewItem.item} />
                <button onClick={() => setPreviewItem(reviewItem.item)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100">
                  <Eye className="h-4 w-4" /> Preview Full Emails
                </button>
              </div>
            )}
            {reviewItem.item.type === "campaign" && (
              <div className="mt-3">
                <CampaignApprovalDetail item={reviewItem.item} />
              </div>
            )}

            <label className="mt-4 block text-sm font-medium text-slate-700">Notes (optional)</label>
            <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)}
              rows={3} placeholder="Add any notes..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />

            <div className="mt-5 flex items-center justify-end gap-3">
              <button onClick={closeReview} disabled={submitting}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
              {reviewItem.action === "approve" ? (
                <button onClick={confirmReview} disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm Approve
                </button>
              ) : (
                <button onClick={confirmReview} disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm Reject
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <ToastNotification toast={toast} onClose={() => setToast(null)} />}

      {/* Email Preview for sequences */}
      {previewItem && previewItem.sequence_detail && (
        <EmailPreview
          steps={(previewItem.sequence_detail.steps ?? []).map((s, i) => ({
            id: `preview_${i}`,
            order: i,
            type: s.type,
            subject: s.subject,
            body: s.body,
            templateFile: (s as { templateFile?: string }).templateFile,
            wait_days: s.wait_days,
            condition: s.condition,
          }))}
          sequenceName={previewItem.title}
          fromEmail={`thomas@${previewItem.sequence_detail.send_from_domain ?? "outreach.tbpauto.com"}`}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
}
