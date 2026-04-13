"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Zap,
  Users,
  Mail,
  BarChart3,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────
interface SyncResult {
  synced_at: string;
  campaigns: { created: number; updated: number; total: number };
  contacts: { created: number; skipped: number; total: number };
  send_logs: { created: number; total: number };
  errors: string[];
}

// ── Component ───────────────────────────────────────────────────
export default function InstantlySyncPanel() {
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showErrors, setShowErrors] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch last sync status on mount
  useEffect(() => {
    fetch("/api/marketing-crm/instantly-sync")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setSyncResult(d.data);
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  const doSync = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing-crm/instantly-sync", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Sync failed (${res.status})`);
        return;
      }
      setSyncResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-sync interval (15 min)
  useEffect(() => {
    if (autoSync) {
      intervalRef.current = setInterval(doSync, 15 * 60 * 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoSync, doSync]);

  const hasErrors = (syncResult?.errors?.length ?? 0) > 0;
  const syncedAt = syncResult?.synced_at;
  const isNever = !syncedAt || syncedAt === "never";

  function formatTime(iso: string): string {
    if (iso === "never") return "Never";
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-orange-100">
            <Zap className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Instantly Sync
            </h3>
            <p className="text-xs text-slate-400">
              Pull campaigns, contacts & send logs from Instantly.ai
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-sync toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-slate-500">Auto (15m)</span>
            <button
              role="switch"
              aria-checked={autoSync}
              onClick={() => setAutoSync(!autoSync)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                autoSync ? "bg-blue-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  autoSync ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>

          {/* Sync button */}
          <button
            onClick={doSync}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {loading ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Loading placeholder ─────────────────────────────────── */}
      {initialLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          <span className="ml-2 text-sm text-slate-400">
            Loading sync status...
          </span>
        </div>
      ) : (
        <>
          {/* ── Stats row ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {/* Last Synced */}
            <div className="rounded-lg bg-slate-50 px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Last Sync
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {isNever ? "Never" : formatTime(syncedAt!)}
              </p>
            </div>

            {/* Campaigns */}
            <div className="rounded-lg bg-slate-50 px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Campaigns
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {syncResult?.campaigns.total ?? 0}
                {(syncResult?.campaigns.created ?? 0) > 0 && (
                  <span className="ml-1 text-xs font-normal text-green-600">
                    +{syncResult!.campaigns.created} new
                  </span>
                )}
              </p>
            </div>

            {/* Contacts */}
            <div className="rounded-lg bg-slate-50 px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Users className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Contacts
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {syncResult?.contacts.total ?? 0}
                {(syncResult?.contacts.created ?? 0) > 0 && (
                  <span className="ml-1 text-xs font-normal text-green-600">
                    +{syncResult!.contacts.created} new
                  </span>
                )}
                {(syncResult?.contacts.skipped ?? 0) > 0 && (
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    ({syncResult!.contacts.skipped} existing)
                  </span>
                )}
              </p>
            </div>

            {/* Send Logs */}
            <div className="rounded-lg bg-slate-50 px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Mail className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Send Logs
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {syncResult?.send_logs.total ?? 0}
                {(syncResult?.send_logs.created ?? 0) > 0 && (
                  <span className="ml-1 text-xs font-normal text-green-600">
                    +{syncResult!.send_logs.created} new
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* ── Success / error summary ─────────────────────────── */}
          {syncResult && !isNever && (
            <div className="flex items-center gap-2 text-xs">
              {hasErrors ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-amber-600 font-medium">
                    Sync completed with {syncResult.errors.length} warning
                    {syncResult.errors.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={() => setShowErrors(!showErrors)}
                    className="ml-1 inline-flex items-center gap-0.5 text-amber-600 hover:text-amber-700 underline"
                  >
                    {showErrors ? "Hide" : "Show"}
                    {showErrors ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-green-600 font-medium">
                    Last sync completed successfully
                  </span>
                </>
              )}
            </div>
          )}

          {/* ── Expandable errors list ──────────────────────────── */}
          {showErrors && hasErrors && (
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 max-h-48 overflow-y-auto">
              <ul className="space-y-1">
                {syncResult!.errors.map((err, i) => (
                  <li
                    key={i}
                    className="text-xs text-amber-700 flex items-start gap-1.5"
                  >
                    <span className="text-amber-400 mt-0.5 flex-shrink-0">
                      &bull;
                    </span>
                    <span className="break-all">{err}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
