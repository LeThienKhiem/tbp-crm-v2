"use client";

import { useState, useEffect } from "react";
import {
  UserPlus,
  GitBranch,
  Send,
  Eye,
  MessageSquare,
  StickyNote,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────

interface ActivityEvent {
  id: string;
  timestamp: string;
  type:
    | "contact_created"
    | "status_change"
    | "email_sent"
    | "email_opened"
    | "email_replied"
    | "note_added"
    | "campaign_added";
  title: string;
  description?: string;
  icon: string;
  color: string;
  metadata?: Record<string, unknown>;
}

interface Props {
  contactId: string;
  contactEmail: string;
}

// ── Icon + color maps ────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  UserPlus,
  GitBranch,
  Send,
  Eye,
  MessageSquare,
  StickyNote,
  Megaphone,
};

const DOT_COLOR_MAP: Record<string, string> = {
  green: "bg-green-500",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  purple: "bg-purple-500",
  indigo: "bg-indigo-500",
};

const ICON_BG_MAP: Record<string, string> = {
  green: "bg-green-100 text-green-600",
  blue: "bg-blue-100 text-blue-600",
  amber: "bg-amber-100 text-amber-600",
  purple: "bg-purple-100 text-purple-600",
  indigo: "bg-indigo-100 text-indigo-600",
};

// ── Date grouping helpers ────────────────────────────────────────

function dateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (target.getTime() === today.getTime()) return "Today";
  if (target.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDate(events: ActivityEvent[]): { label: string; events: ActivityEvent[] }[] {
  const groups: Map<string, ActivityEvent[]> = new Map();
  for (const event of events) {
    const label = dateLabel(event.timestamp);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(event);
  }
  return Array.from(groups.entries()).map(([label, events]) => ({ label, events }));
}

// ── Component ────────────────────────────────────────────────────

export default function ActivityTimeline({ contactId }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchActivity() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/marketing-crm/contacts/${contactId}/activity`);
        if (!res.ok) throw new Error("Failed to load activity");
        const json = await res.json();
        if (!cancelled) setEvents(json.data ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchActivity();
    return () => { cancelled = true; };
  }, [contactId]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-1.5 pt-0.5">
              <div className="h-3.5 w-3/4 rounded bg-slate-200" />
              <div className="h-3 w-1/2 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (events.length === 0) {
    return <p className="text-sm text-slate-500">No activity yet</p>;
  }

  const grouped = groupByDate(events);

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <div key={group.label}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {group.label}
          </p>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[15px] top-2 bottom-2 border-l-2 border-slate-200" />

            <div className="space-y-0.5">
              {group.events.map((event) => {
                const IconComponent = ICON_MAP[event.icon] ?? Send;
                const dotColor = DOT_COLOR_MAP[event.color] ?? "bg-slate-400";
                const iconBg = ICON_BG_MAP[event.color] ?? "bg-slate-100 text-slate-600";

                return (
                  <div
                    key={event.id}
                    className="group relative flex items-start gap-3 rounded-lg p-3 hover:bg-slate-50 transition-colors"
                  >
                    {/* Dot + icon */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${iconBg}`}>
                        <IconComponent className="h-3.5 w-3.5" />
                      </div>
                      <div className={`mt-1 h-2 w-2 rounded-full ${dotColor}`} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {event.title}
                      </p>
                      {event.description && (
                        <p className="mt-0.5 text-sm text-slate-600 truncate">
                          {event.description}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-slate-400">
                        {relativeTime(event.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
