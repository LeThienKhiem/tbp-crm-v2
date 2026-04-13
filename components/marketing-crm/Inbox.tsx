"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Inbox as InboxIcon,
  Loader2,
  Mail,
  MailOpen,
  RefreshCw,
  Reply,
  Search,
  X,
} from "lucide-react";
import type { InstantlyEmail } from "@/services/instantlyService";

/* ── Helpers ──────────────────────────────────────────────────── */

type EmailFilter = "all" | "received" | "sent" | "manual";

const FILTER_TABS: { value: EmailFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "received", label: "Received" },
  { value: "sent", label: "Sent" },
  { value: "manual", label: "Manual" },
];

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "...";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function senderName(email: InstantlyEmail): string {
  const addr = email.from_address_email ?? "";
  const local = addr.split("@")[0] ?? "";
  return local
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── Component ────────────────────────────────────────────────── */

export default function Inbox() {
  const [emails, setEmails] = useState<InstantlyEmail[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<EmailFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);

  /* ── Fetch ───────────────────────────────────────────────── */
  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (filter !== "all") params.set("email_type", filter);
      const res = await fetch(`/api/marketing-crm/inbox?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load emails");
      setEmails(json.data ?? []);
      setUnreadCount(json.unread_count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  /* ── Derived ─────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    if (!search.trim()) return emails;
    const q = search.toLowerCase();
    return emails.filter(
      (e) =>
        (e.subject ?? "").toLowerCase().includes(q) ||
        (e.from_address_email ?? "").toLowerCase().includes(q) ||
        (e.to_address_email ?? "").toLowerCase().includes(q) ||
        stripHtml(e.body?.html ?? e.body?.text ?? "")
          .toLowerCase()
          .includes(q)
    );
  }, [emails, search]);

  const selected = useMemo(
    () => filtered.find((e) => e.id === selectedId) ?? null,
    [filtered, selectedId]
  );

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="rounded-xl border border-slate-200 bg-white ring-1 ring-slate-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <InboxIcon className="h-5 w-5 text-slate-600" />
          <h2 className="text-base font-semibold text-slate-900">Inbox</h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold leading-none text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={fetchEmails}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex" style={{ minHeight: 540 }}>
        {/* LEFT — email list */}
        <div className="w-80 shrink-0 border-r border-slate-200">
          {/* Filters */}
          <div className="flex gap-1 border-b border-slate-100 px-3 py-2">
            {FILTER_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setFilter(t.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  filter === t.value
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative border-b border-slate-100 px-3 py-2">
            <Search className="absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search emails..."
              className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>

          {/* Email list */}
          <div className="overflow-y-auto" style={{ maxHeight: 440 }}>
            {loading && emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="mt-2 text-xs">Loading emails...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Mail className="h-6 w-6" />
                <span className="mt-2 text-xs">No emails found</span>
              </div>
            ) : (
              filtered.map((email) => {
                const isSelected = email.id === selectedId;
                const isUnread = email.is_unread;
                const snippet = stripHtml(
                  email.body?.text ?? email.body?.html ?? ""
                );
                return (
                  <button
                    key={email.id}
                    onClick={() => setSelectedId(email.id)}
                    className={`w-full border-b border-slate-100 px-3 py-3 text-left transition-colors ${
                      isSelected
                        ? "border-blue-300 bg-blue-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {/* Unread dot */}
                      <div className="mt-1.5 shrink-0">
                        {isUnread ? (
                          <span className="block h-2 w-2 rounded-full bg-blue-500" />
                        ) : (
                          <span className="block h-2 w-2" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`truncate text-xs ${
                              isUnread
                                ? "font-semibold text-slate-900"
                                : "font-medium text-slate-700"
                            }`}
                          >
                            {senderName(email)}
                          </span>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {relativeTime(email.timestamp_created)}
                          </span>
                        </div>
                        <p
                          className={`mt-0.5 truncate text-xs ${
                            isUnread
                              ? "font-semibold text-slate-800"
                              : "text-slate-600"
                          }`}
                        >
                          {truncate(email.subject ?? "(no subject)", 50)}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-400">
                          {truncate(snippet, 80)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT — detail */}
        <div className="flex flex-1 flex-col">
          {selected ? (
            <>
              {/* Detail header */}
              <div className="border-b border-slate-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  {selected.subject ?? "(no subject)"}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>
                    <span className="text-slate-400">From:</span>{" "}
                    <span className="font-mono text-slate-700">
                      {selected.from_address_email}
                    </span>
                  </span>
                  <span>
                    <span className="text-slate-400">To:</span>{" "}
                    <span className="font-mono text-slate-700">
                      {selected.to_address_email}
                    </span>
                  </span>
                  <span>
                    <span className="text-slate-400">Date:</span>{" "}
                    {new Date(selected.timestamp_created).toLocaleString()}
                  </span>
                </div>
                {selected.campaign_id && (
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200">
                      Campaign: {selected.campaign_id}
                    </span>
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setReplyOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    <Reply className="h-3.5 w-3.5" />
                    Reply
                  </button>
                  <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50">
                    <MailOpen className="h-3.5 w-3.5" />
                    Mark as Read
                  </button>
                </div>
              </div>

              {/* Email body */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {selected.body?.html ? (
                  <div
                    className="prose prose-sm max-w-none text-slate-700"
                    dangerouslySetInnerHTML={{ __html: selected.body.html }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">
                    {selected.body?.text ?? "(no body)"}
                  </pre>
                )}
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
              <InboxIcon className="h-12 w-12" />
              <p className="mt-3 text-sm font-medium">Select an email to read</p>
              <p className="mt-1 text-xs">
                Choose an email from the list on the left
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reply Modal */}
      {replyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Reply</h3>
              <button
                onClick={() => setReplyOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Reply via Instantly web app — the Instantly API v2 does not expose a
              direct reply endpoint. Open your Instantly dashboard to respond to
              this email.
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setReplyOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
