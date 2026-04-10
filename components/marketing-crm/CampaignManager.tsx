import { useState, useEffect, useCallback } from "react";
import {
  Megaphone,
  Plus,
  AlertTriangle,
  Lock,
  ArrowLeft,
  Users,
  Mail,
  Eye,
  MessageSquare,
  MousePointerClick,
  XCircle,
  Send,
  Pause,
  Play,
  X,
  CheckCircle2,
  Clock,
  CalendarDays,
} from "lucide-react";
import type {
  Campaign,
  CampaignStatus,
  CampaignPlatform,
  CampaignStats,
} from "@/types/marketing";

// ── Color / label maps ──────────────────────────────────────────
const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: "bg-slate-50 text-slate-700 ring-slate-600/20",
  pending_approval: "bg-amber-50 text-amber-700 ring-amber-600/20",
  approved: "bg-green-50 text-green-700 ring-green-600/20",
  sending: "bg-blue-50 text-blue-700 ring-blue-600/20",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  paused: "bg-orange-50 text-orange-700 ring-orange-600/20",
  completed: "bg-slate-50 text-slate-600 ring-slate-500/20",
};

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  sending: "Sending",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

const PLATFORM_STYLES: Record<CampaignPlatform, string> = {
  instantly: "bg-purple-50 text-purple-700 ring-purple-600/20",
  lemlist: "bg-orange-50 text-orange-700 ring-orange-600/20",
};

const PLATFORM_LABELS: Record<CampaignPlatform, string> = {
  instantly: "Instantly.ai",
  lemlist: "Lemlist",
};

const SEQUENCE_OPTIONS = [
  "Cold Outreach \u2014 Fleet Managers",
  "Follow-up \u2014 Trade Show Leads",
  "Re-engagement \u2014 Dormant Contacts",
];

// ── Helpers ─────────────────────────────────────────────────────
function pct(count: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Component ───────────────────────────────────────────────────
export default function CampaignManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // create-form state
  const [newName, setNewName] = useState("");
  const [newSequence, setNewSequence] = useState(SEQUENCE_OPTIONS[0]);
  const [newPlatform, setNewPlatform] = useState<CampaignPlatform>("instantly");
  const [newContactCount, setNewContactCount] = useState(50);

  // toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ── Fetch campaigns ──────────────────────────────────────────
  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/marketing-crm/campaigns");
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      const json = await res.json();
      setCampaigns(json.data ?? []);
    } catch {
      showToast("Failed to load campaigns", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // ── Toast helper ─────────────────────────────────────────────
  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Create campaign ──────────────────────────────────────────
  async function handleCreate() {
    if (!newName.trim()) {
      showToast("Campaign name is required", "error");
      return;
    }
    try {
      const res = await fetch("/api/marketing-crm/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          sequence_name: newSequence,
          platform: newPlatform,
          contact_count: newContactCount,
          send_from: "thomas@outreach.tbpauto.com",
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      showToast("Campaign created");
      setShowCreateModal(false);
      setNewName("");
      setNewSequence(SEQUENCE_OPTIONS[0]);
      setNewPlatform("instantly");
      setNewContactCount(50);
      fetchCampaigns();
    } catch {
      showToast("Failed to create campaign", "error");
    }
  }

  // ── Toggle pause / resume ────────────────────────────────────
  async function handleTogglePause(campaign: Campaign) {
    const action = campaign.status === "paused" ? "resume" : "pause";
    try {
      const res = await fetch(`/api/marketing-crm/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Action failed");
      showToast(`Campaign ${action === "pause" ? "paused" : "resumed"}`);
      fetchCampaigns();
    } catch {
      showToast(`Failed to ${action} campaign`, "error");
    }
  }

  // ── Mini stats bar for card ──────────────────────────────────
  function MiniStats({ stats }: { stats: CampaignStats }) {
    if (!stats.total_sent) return null;
    const items = [
      { label: "Sent", value: stats.total_sent, color: "bg-slate-400" },
      { label: "Opened", value: stats.opened, color: "bg-emerald-500" },
      { label: "Replied", value: stats.replied, color: "bg-green-500" },
    ];
    return (
      <div className="mt-3 flex items-center gap-4">
        {items.map((item) => (
          <div key={item.label} className="flex-1">
            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>{item.label}</span>
              <span>{item.value}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100">
              <div
                className={`h-1.5 rounded-full ${item.color}`}
                style={{ width: pct(item.value, stats.total_sent) }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Detail view ──────────────────────────────────────────────
  if (selectedCampaign) {
    const c = selectedCampaign;
    const s = c.stats;
    const statCards: {
      label: string;
      value: number;
      color: string;
      icon: React.ReactNode;
    }[] = [
      { label: "Total Sent", value: s.total_sent, color: "text-slate-700", icon: <Send className="h-4 w-4" /> },
      { label: "Delivered", value: s.delivered, color: "text-blue-600", icon: <Mail className="h-4 w-4" /> },
      { label: "Opened", value: s.opened, color: "text-emerald-600", icon: <Eye className="h-4 w-4" /> },
      { label: "Replied", value: s.replied, color: "text-green-600", icon: <MessageSquare className="h-4 w-4" /> },
      { label: "Clicked", value: s.clicked, color: "text-purple-600", icon: <MousePointerClick className="h-4 w-4" /> },
      { label: "Bounced", value: s.bounced, color: "text-red-600", icon: <XCircle className="h-4 w-4" /> },
    ];

    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => setSelectedCampaign(null)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Campaigns
        </button>

        {/* Header */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">{c.name}</h2>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${PLATFORM_STYLES[c.platform]}`}
            >
              {PLATFORM_LABELS[c.platform]}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[c.status]} ${
                c.status === "sending" ? "animate-pulse" : ""
              }`}
            >
              {STATUS_LABELS[c.status]}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {c.contact_count} contacts &middot; {c.sequence_name}
          </p>
        </div>

        {/* Stat cards 2x3 */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {statCards.map((sc) => (
            <div
              key={sc.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className={`flex items-center gap-2 ${sc.color}`}>
                {sc.icon}
                <span className="text-sm font-medium">{sc.label}</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{sc.value.toLocaleString()}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {pct(sc.value, s.total_sent)} of sent
              </p>
            </div>
          ))}
        </div>

        {/* Send-from domain */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Lock className="h-4 w-4 text-slate-400" />
            <span className="font-medium">Sending from:</span>
            <span className="text-slate-900">{c.send_from}</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Timeline</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <span>Started: {fmtDate(c.started_at)}</span>
            </div>
            {c.completed_at && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Completed: {fmtDate(c.completed_at)}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>Created: {fmtDate(c.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Mock data banner */}
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Not Connected &mdash; Using Mock Data</span>
        </div>

        {/* Toast */}
        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    );
  }

  // ── Grid view (default) ──────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Megaphone className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">Campaigns</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Platform connection badges */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
            <AlertTriangle className="h-3 w-3" />
            Instantly.ai &mdash; Mock Mode
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
            <AlertTriangle className="h-3 w-3" />
            Lemlist &mdash; Mock Mode
          </span>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-16 text-center text-sm text-slate-500">Loading campaigns...</div>
      )}

      {/* Empty state */}
      {!loading && campaigns.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <Megaphone className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">No campaigns yet</p>
          <p className="mt-1 text-sm text-slate-500">Create your first campaign to get started.</p>
        </div>
      )}

      {/* Campaign cards grid */}
      {!loading && campaigns.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              {/* Top row: name + badges */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900">{c.name}</h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${PLATFORM_STYLES[c.platform]}`}
                  >
                    {PLATFORM_LABELS[c.platform]}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[c.status]} ${
                      c.status === "sending" ? "animate-pulse" : ""
                    }`}
                  >
                    {STATUS_LABELS[c.status]}
                  </span>
                </div>
              </div>

              {/* Meta */}
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <Users className="h-3.5 w-3.5" />
                <span>{c.contact_count} contacts</span>
                <span className="text-slate-300">&middot;</span>
                <span>{c.sequence_name}</span>
              </div>

              {/* Mini stats */}
              <MiniStats stats={c.stats} />

              {/* Send-from domain */}
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                <Lock className="h-3 w-3" />
                <span>{c.send_from}</span>
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => setSelectedCampaign(c)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  View Details
                </button>
                {(c.status === "active" || c.status === "sending") && (
                  <button
                    onClick={() => handleTogglePause(c)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Pause
                  </button>
                )}
                {c.status === "paused" && (
                  <button
                    onClick={() => handleTogglePause(c)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Resume
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Campaign Modal ────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">New Campaign</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Q2 Fleet Manager Outreach"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Sequence */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Sequence
                </label>
                <select
                  value={newSequence}
                  onChange={(e) => setNewSequence(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  {SEQUENCE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Platform */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Platform
                </label>
                <div className="flex gap-3">
                  {(["instantly", "lemlist"] as CampaignPlatform[]).map((p) => (
                    <label
                      key={p}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                        newPlatform === p
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="platform"
                        value={p}
                        checked={newPlatform === p}
                        onChange={() => setNewPlatform(p)}
                        className="sr-only"
                      />
                      {PLATFORM_LABELS[p]}
                    </label>
                  ))}
                </div>
              </div>

              {/* Contact count */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Contact Count
                </label>
                <input
                  type="number"
                  min={1}
                  value={newContactCount}
                  onChange={(e) => setNewContactCount(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Send-from (locked) */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Send From
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  <span>thomas@outreach.tbpauto.com</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

// ── Toast component ─────────────────────────────────────────────
function Toast({
  toast,
  onClose,
}: {
  toast: { message: string; type: "success" | "error" } | null;
  onClose: () => void;
}) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4">
      <div
        className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
          toast.type === "success"
            ? "bg-green-600 text-white"
            : "bg-red-600 text-white"
        }`}
      >
        {toast.type === "success" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        <span>{toast.message}</span>
        <button onClick={onClose} className="ml-2 rounded p-0.5 hover:bg-white/20">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
