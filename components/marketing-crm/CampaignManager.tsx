"use client";
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
  Zap,
  BarChart3,
  UserPlus,
  Trash2,
  Rocket,
  Server,
  Shield,
  RefreshCw,
} from "lucide-react";

// ── Types matching Instantly API response ─────────────────────
interface InstantlyCampaignData {
  id: string;
  name: string;
  status: number;
  status_label: string;
  daily_limit?: number;
  email_list?: string[];
  schedule?: {
    start_date?: string | null;
    end_date?: string | null;
    schedules?: {
      name: string;
      timing: { from: string; to: string };
      days: Record<string, boolean>;
      timezone: string;
    }[];
  };
  sequences?: {
    delay?: number;
    delay_unit?: string;
    variants?: { subject: string; body: string }[];
  }[];
  stop_on_reply?: boolean;
  link_tracking?: boolean;
  open_tracking?: boolean;
  text_only?: boolean;
  created_at?: string;
  updated_at?: string;
  // Analytics (merged)
  leads_count: number;
  contacted_count: number;
  emails_sent: number;
  opens: number;
  replies: number;
  clicks: number;
  bounces: number;
  unsubscribes: number;
  completed: number;
  opportunities: number;
  opportunity_value: number;
}

interface SendingAccount {
  email: string;
  status: number;
  status_label: string;
  first_name?: string;
  last_name?: string;
  daily_limit?: number;
  sending_gap?: number;
  warmup_status?: number;
  warmup?: { warmup_limit?: number };
}

// ── Status color map ──────────────────────────────────────────
const STATUS_COLORS: Record<number, string> = {
  0: "bg-slate-50 text-slate-700 ring-slate-600/20",
  1: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  2: "bg-orange-50 text-orange-700 ring-orange-600/20",
  3: "bg-slate-100 text-slate-600 ring-slate-500/20",
  4: "bg-blue-50 text-blue-700 ring-blue-600/20",
  [-1]: "bg-red-50 text-red-700 ring-red-600/20",
  [-2]: "bg-amber-50 text-amber-700 ring-amber-600/20",
  [-99]: "bg-red-50 text-red-700 ring-red-600/20",
};

const ACCOUNT_STATUS_COLORS: Record<number, string> = {
  1: "bg-emerald-50 text-emerald-700",
  2: "bg-orange-50 text-orange-700",
  3: "bg-amber-50 text-amber-700",
  [-1]: "bg-red-50 text-red-700",
  [-2]: "bg-red-50 text-red-700",
  [-3]: "bg-red-50 text-red-700",
};

// ── Helpers ───────────────────────────────────────────────────
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

function fmtNum(n: number): string {
  return n.toLocaleString();
}

// ── Main Component ────────────────────────────────────────────
export default function CampaignManager() {
  const [campaigns, setCampaigns] = useState<InstantlyCampaignData[]>([]);
  const [accounts, setAccounts] = useState<SendingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<InstantlyCampaignData | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAccountsPanel, setShowAccountsPanel] = useState(false);
  const [showPushLeadsModal, setShowPushLeadsModal] = useState<string | null>(null); // campaign id
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDailyLimit, setNewDailyLimit] = useState(50);
  const [newSteps, setNewSteps] = useState<{ subject: string; body: string; delay: number }[]>([
    { subject: "", body: "", delay: 0 },
  ]);

  // Push leads state
  const [pushLoading, setPushLoading] = useState(false);

  // ── Fetch ───────────────────────────────────────────────────
  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/marketing-crm/campaigns");
      const json = await res.json();
      if (json.error && json.source === "not_configured") {
        setSource("not_configured");
        setCampaigns([]);
      } else if (json.error) {
        setError(json.error);
        setCampaigns([]);
      } else {
        setCampaigns(json.data ?? []);
        setSource(json.source ?? "instantly");
      }
    } catch {
      setError("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/marketing-crm/accounts");
      const json = await res.json();
      setAccounts(json.data ?? []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchAccounts();
  }, [fetchCampaigns, fetchAccounts]);

  // ── Toast ───────────────────────────────────────────────────
  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Campaign actions ────────────────────────────────────────
  async function handleActivate(id: string) {
    try {
      const res = await fetch(`/api/marketing-crm/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate" }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Activate failed");
      }
      showToast("Campaign activated!");
      fetchCampaigns();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to activate", "error");
    }
  }

  async function handlePause(id: string) {
    try {
      const res = await fetch(`/api/marketing-crm/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      });
      if (!res.ok) throw new Error("Pause failed");
      showToast("Campaign paused");
      fetchCampaigns();
    } catch {
      showToast("Failed to pause campaign", "error");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this campaign? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/marketing-crm/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showToast("Campaign deleted");
      setSelectedCampaign(null);
      fetchCampaigns();
    } catch {
      showToast("Failed to delete campaign", "error");
    }
  }

  // ── Create campaign ─────────────────────────────────────────
  async function handleCreate() {
    if (!newName.trim()) {
      showToast("Campaign name is required", "error");
      return;
    }

    // Build Instantly sequences format
    const sequences = newSteps.map((step, i) => ({
      delay: i === 0 ? 0 : step.delay,
      delay_unit: "day",
      variants: [{ subject: step.subject, body: step.body }],
    }));

    // Use connected accounts as email_list
    const activeAccounts = accounts.filter((a) => a.status === 1).map((a) => a.email);

    try {
      const res = await fetch("/api/marketing-crm/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          sequences,
          email_list: activeAccounts,
          daily_limit: newDailyLimit,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Create failed");
      }
      showToast("Campaign created in Instantly!");
      setShowCreateModal(false);
      setNewName("");
      setNewDailyLimit(50);
      setNewSteps([{ subject: "", body: "", delay: 0 }]);
      fetchCampaigns();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to create campaign", "error");
    }
  }

  // ── Push leads to campaign ──────────────────────────────────
  async function handlePushLeads(campaignId: string) {
    setPushLoading(true);
    try {
      // Fetch approved contacts from Airtable
      const contactsRes = await fetch("/api/marketing-crm/contacts");
      const contactsJson = await contactsRes.json();
      const contacts = (contactsJson.data ?? []).filter(
        (c: { status: string }) => c.status === "approved" || c.status === "new"
      );

      if (contacts.length === 0) {
        showToast("No approved/new contacts to push", "error");
        setPushLoading(false);
        setShowPushLeadsModal(null);
        return;
      }

      const leads = contacts.map((c: { email: string; first_name: string; last_name: string; company: string; title: string; phone?: string }) => ({
        email: c.email,
        first_name: c.first_name,
        last_name: c.last_name,
        company_name: c.company,
        job_title: c.title,
        phone: c.phone || undefined,
      }));

      const res = await fetch("/api/marketing-crm/instantly-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId, leads }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Push failed");
      }

      const result = await res.json();
      const d = result.data;

      // Log send entries to Airtable for tracking
      const campaign = campaigns.find((c) => c.id === campaignId);
      try {
        const sendLogs = contacts.map((c: { email: string; first_name: string; last_name: string; company: string }) => ({
          contact_email: c.email,
          contact_name: `${c.first_name} ${c.last_name}`.trim(),
          contact_company: c.company || "",
          campaign_id: campaignId,
          campaign_name: campaign?.name ?? campaignId,
          sequence_step: 1,
          subject: campaign?.sequences?.[0]?.variants?.[0]?.subject ?? "",
          body_preview: campaign?.sequences?.[0]?.variants?.[0]?.body?.slice(0, 200) ?? "",
          status: "queued",
          sent_at: new Date().toISOString(),
        }));
        await fetch("/api/marketing-crm/send-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logs: sendLogs }),
        });
      } catch {
        // Non-blocking — don't fail the push if logging fails
        console.warn("Failed to create send logs (non-blocking)");
      }

      showToast(`Pushed ${d.leads_uploaded} leads (${d.duplicated_leads} duplicates skipped)`);
      setShowPushLeadsModal(null);
      fetchCampaigns();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to push leads", "error");
    } finally {
      setPushLoading(false);
    }
  }

  // ── Totals ──────────────────────────────────────────────────
  const totals = campaigns.reduce(
    (acc, c) => ({
      leads: acc.leads + c.leads_count,
      sent: acc.sent + c.emails_sent,
      opens: acc.opens + c.opens,
      replies: acc.replies + c.replies,
    }),
    { leads: 0, sent: 0, opens: 0, replies: 0 }
  );

  // ── Detail view ─────────────────────────────────────────────
  if (selectedCampaign) {
    const c = selectedCampaign;
    const statCards = [
      { label: "Leads", value: c.leads_count, color: "text-slate-700", icon: <Users className="h-4 w-4" /> },
      { label: "Emails Sent", value: c.emails_sent, color: "text-blue-600", icon: <Send className="h-4 w-4" /> },
      { label: "Opened", value: c.opens, color: "text-emerald-600", icon: <Eye className="h-4 w-4" /> },
      { label: "Replied", value: c.replies, color: "text-green-600", icon: <MessageSquare className="h-4 w-4" /> },
      { label: "Clicked", value: c.clicks, color: "text-purple-600", icon: <MousePointerClick className="h-4 w-4" /> },
      { label: "Bounced", value: c.bounces, color: "text-red-600", icon: <XCircle className="h-4 w-4" /> },
    ];

    const scheduleInfo = c.schedule?.schedules?.[0];

    return (
      <div className="space-y-6">
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
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
              Instantly.ai
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                STATUS_COLORS[c.status] ?? "bg-slate-50 text-slate-700"
              } ${c.status === 1 ? "animate-pulse" : ""}`}
            >
              {c.status_label}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {c.leads_count} leads &middot; {c.email_list?.length ?? 0} sending account(s)
            {c.daily_limit ? ` \u00B7 ${c.daily_limit}/day limit` : ""}
          </p>

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {c.status === 0 && (
              <button
                onClick={() => handleActivate(c.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <Rocket className="h-4 w-4" />
                Launch Campaign
              </button>
            )}
            {c.status === 1 && (
              <button
                onClick={() => handlePause(c.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
              >
                <Pause className="h-4 w-4" />
                Pause
              </button>
            )}
            {c.status === 2 && (
              <button
                onClick={() => handleActivate(c.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
              >
                <Play className="h-4 w-4" />
                Resume
              </button>
            )}
            <button
              onClick={() => setShowPushLeadsModal(c.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              <UserPlus className="h-4 w-4" />
              Push Contacts
            </button>
            <button
              onClick={() => handleDelete(c.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {statCards.map((sc) => (
            <div key={sc.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className={`flex items-center gap-2 ${sc.color}`}>
                {sc.icon}
                <span className="text-sm font-medium">{sc.label}</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{fmtNum(sc.value)}</p>
              {c.emails_sent > 0 && sc.label !== "Leads" && sc.label !== "Emails Sent" && (
                <p className="mt-0.5 text-xs text-slate-500">{pct(sc.value, c.emails_sent)} of sent</p>
              )}
            </div>
          ))}
        </div>

        {/* Sequences / Steps */}
        {c.sequences && c.sequences.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Email Steps ({c.sequences.length})</h3>
            <div className="space-y-3">
              {c.sequences.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {i + 1}
                  </div>
                  <div className="flex-1 rounded-lg border border-slate-100 bg-slate-50 p-3">
                    {step.delay && step.delay > 0 ? (
                      <p className="mb-1 text-xs text-slate-500">Wait {step.delay} {step.delay_unit || "day"}(s) then send:</p>
                    ) : null}
                    {step.variants?.[0] && (
                      <>
                        <p className="text-sm font-medium text-slate-800">
                          {step.variants[0].subject || "(No subject)"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {step.variants[0].body?.replace(/<[^>]+>/g, "").slice(0, 150) || "(No body)"}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule */}
        {scheduleInfo && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Schedule</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>{scheduleInfo.timing.from} - {scheduleInfo.timing.to} ({scheduleInfo.timezone})</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <span>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                    .filter((_, i) => scheduleInfo.days[String(i)])
                    .join(", ")}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Sending accounts for this campaign */}
        {c.email_list && c.email_list.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Sending Accounts ({c.email_list.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {c.email_list.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                >
                  <Mail className="h-3 w-3" />
                  {email}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Settings</h3>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-2.5">
              <p className="text-xs text-slate-500">Daily Limit</p>
              <p className="font-medium text-slate-800">{c.daily_limit ?? "N/A"}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5">
              <p className="text-xs text-slate-500">Stop on Reply</p>
              <p className="font-medium text-slate-800">{c.stop_on_reply ? "Yes" : "No"}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5">
              <p className="text-xs text-slate-500">Open Tracking</p>
              <p className="font-medium text-slate-800">{c.open_tracking ? "On" : "Off"}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5">
              <p className="text-xs text-slate-500">Link Tracking</p>
              <p className="font-medium text-slate-800">{c.link_tracking ? "On" : "Off"}</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Timeline</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <span>Created: {fmtDate(c.created_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>Updated: {fmtDate(c.updated_at)}</span>
            </div>
          </div>
        </div>

        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    );
  }

  // ── Grid view (default) ─────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Megaphone className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">Campaigns</h2>
          {source === "instantly" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <Zap className="h-3 w-3" />
              Instantly.ai Connected
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {source === "not_configured" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
              <AlertTriangle className="h-3 w-3" />
              API Key Not Set
            </span>
          )}
          <button
            onClick={() => setShowAccountsPanel(!showAccountsPanel)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Server className="h-4 w-4" />
            Accounts ({accounts.length})
          </button>
          <button
            onClick={() => fetchCampaigns()}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Leads", value: totals.leads, icon: <Users className="h-4 w-4" />, iconBg: "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400", accent: "border-l-violet-400" },
            { label: "Emails Sent", value: totals.sent, icon: <Send className="h-4 w-4" />, iconBg: "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400", accent: "border-l-sky-400" },
            { label: "Total Opens", value: totals.opens, icon: <Eye className="h-4 w-4" />, iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400", accent: "border-l-emerald-400" },
            { label: "Total Replies", value: totals.replies, icon: <MessageSquare className="h-4 w-4" />, iconBg: "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400", accent: "border-l-orange-400" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border-l-4 ${s.accent} border border-slate-200 bg-white p-4 shadow-sm dark:border-[#2a2d32] dark:bg-[#22252a]`}>
              <div className={`mb-1 inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs ${s.iconBg}`}>
                {s.icon}
                <span className="font-medium">{s.label}</span>
              </div>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{fmtNum(s.value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sending Accounts Panel */}
      {showAccountsPanel && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Server className="h-4 w-4 text-slate-400" />
              Sending Accounts
            </h3>
            <button onClick={() => setShowAccountsPanel(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          {accounts.length === 0 ? (
            <p className="text-sm text-slate-500">No sending accounts connected. Add accounts in your Instantly.ai dashboard.</p>
          ) : (
            <div className="space-y-2">
              {accounts.map((a) => (
                <div key={a.email} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACCOUNT_STATUS_COLORS[a.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {a.status_label}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{a.email}</p>
                      <p className="text-xs text-slate-500">
                        {a.first_name} {a.last_name} &middot; {a.daily_limit ?? "?"}/day
                        {a.warmup_status === 1 ? " \u00B7 Warming up" : ""}
                      </p>
                    </div>
                  </div>
                  <Shield className={`h-4 w-4 ${a.status === 1 ? "text-emerald-500" : "text-slate-300"}`} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-16 text-center text-sm text-slate-500">Loading campaigns from Instantly.ai...</div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && campaigns.length === 0 && source !== "not_configured" && (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <Megaphone className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">No campaigns in Instantly.ai</p>
          <p className="mt-1 text-sm text-slate-500">Create your first campaign to start sending cold outreach.</p>
        </div>
      )}

      {/* Not configured */}
      {!loading && source === "not_configured" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-12 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
          <p className="mt-3 text-sm font-medium text-amber-800">Instantly.ai API Key not configured</p>
          <p className="mt-1 text-sm text-amber-600">Add INSTANTLY_API_KEY to .env.local to connect.</p>
        </div>
      )}

      {/* Campaign cards grid */}
      {!loading && campaigns.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
              {/* Top row */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900">{c.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                    Instantly
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                      STATUS_COLORS[c.status] ?? "bg-slate-50 text-slate-700"
                    } ${c.status === 1 ? "animate-pulse" : ""}`}
                  >
                    {c.status_label}
                  </span>
                </div>
              </div>

              {/* Meta */}
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <Users className="h-3.5 w-3.5" />
                <span>{fmtNum(c.leads_count)} leads</span>
                <span className="text-slate-300">&middot;</span>
                <span>{c.sequences?.length ?? 0} steps</span>
                {c.email_list && c.email_list.length > 0 && (
                  <>
                    <span className="text-slate-300">&middot;</span>
                    <span>{c.email_list.length} accounts</span>
                  </>
                )}
              </div>

              {/* Mini stats bars */}
              {c.emails_sent > 0 && (
                <div className="mt-3 flex items-center gap-4">
                  {[
                    { label: "Sent", value: c.emails_sent, color: "bg-slate-400" },
                    { label: "Opened", value: c.opens, color: "bg-emerald-500" },
                    { label: "Replied", value: c.replies, color: "bg-green-500" },
                  ].map((item) => (
                    <div key={item.label} className="flex-1">
                      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{item.label}</span>
                        <span>{fmtNum(item.value)}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100">
                        <div
                          className={`h-1.5 rounded-full ${item.color}`}
                          style={{ width: pct(item.value, c.emails_sent) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => setSelectedCampaign(c)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <BarChart3 className="mr-1.5 inline h-3.5 w-3.5" />
                  Details
                </button>
                {c.status === 0 && (
                  <button
                    onClick={() => handleActivate(c.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    Launch
                  </button>
                )}
                {c.status === 1 && (
                  <button
                    onClick={() => handlePause(c.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Pause
                  </button>
                )}
                {c.status === 2 && (
                  <button
                    onClick={() => handleActivate(c.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Resume
                  </button>
                )}
                <button
                  onClick={() => setShowPushLeadsModal(c.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Push Leads
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Campaign Modal ──────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">New Instantly Campaign</h3>
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
                <label className="mb-1 block text-sm font-medium text-slate-700">Campaign Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Q2 Fleet Manager Outreach"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Daily limit */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Daily Limit</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={newDailyLimit}
                  onChange={(e) => setNewDailyLimit(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Sending accounts info */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Sending Accounts</label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                  <Lock className="mr-1.5 inline h-3.5 w-3.5 text-slate-400" />
                  {accounts.filter((a) => a.status === 1).length} active account(s) will be used
                </div>
              </div>

              {/* Email steps */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email Steps ({newSteps.length})
                </label>
                <div className="space-y-3">
                  {newSteps.map((step, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600">Step {i + 1}</span>
                        {i > 0 && (
                          <button
                            onClick={() => setNewSteps(newSteps.filter((_, j) => j !== i))}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {i > 0 && (
                        <div className="mb-2">
                          <label className="mb-1 block text-xs text-slate-500">Wait (days)</label>
                          <input
                            type="number"
                            min={1}
                            value={step.delay}
                            onChange={(e) => {
                              const updated = [...newSteps];
                              updated[i] = { ...updated[i], delay: Number(e.target.value) };
                              setNewSteps(updated);
                            }}
                            className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                      )}
                      <input
                        type="text"
                        placeholder="Subject line..."
                        value={step.subject}
                        onChange={(e) => {
                          const updated = [...newSteps];
                          updated[i] = { ...updated[i], subject: e.target.value };
                          setNewSteps(updated);
                        }}
                        className="mb-2 w-full rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                      />
                      <textarea
                        placeholder="Email body (HTML or plain text)... Use {{first_name}}, {{company_name}} for personalization."
                        value={step.body}
                        onChange={(e) => {
                          const updated = [...newSteps];
                          updated[i] = { ...updated[i], body: e.target.value };
                          setNewSteps(updated);
                        }}
                        rows={3}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setNewSteps([...newSteps, { subject: "", body: "", delay: 3 }])}
                  className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  + Add Step
                </button>
              </div>
            </div>

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
                Create in Instantly
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Push Leads Modal ───────────────────────────────────── */}
      {showPushLeadsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Push Contacts to Campaign</h3>
              <button
                onClick={() => setShowPushLeadsModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-4 text-sm text-slate-600">
              This will push all <strong>new</strong> and <strong>approved</strong> contacts from
              Airtable into this Instantly campaign. Duplicates will be automatically skipped.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPushLeadsModal(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePushLeads(showPushLeadsModal)}
                disabled={pushLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {pushLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Pushing...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Push Contacts
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

// ── Toast component ───────────────────────────────────────────
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
          toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}
      >
        {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        <span>{toast.message}</span>
        <button onClick={onClose} className="ml-2 rounded p-0.5 hover:bg-white/20">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
