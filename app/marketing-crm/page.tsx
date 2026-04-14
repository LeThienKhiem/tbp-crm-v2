"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Users,
  Mail,
  FileText,
  ShieldCheck,
  Inbox as InboxIcon,
  Megaphone,
  Kanban,
  BarChart3,
  Moon,
  Sun,
} from "lucide-react";
import type { MarketingTab } from "@/types/marketing";

import ContactHub from "@/components/marketing-crm/ContactHub";
import SequenceBuilder from "@/components/marketing-crm/SequenceBuilder";
import ApprovalCenter from "@/components/marketing-crm/ApprovalCenter";
import EmailTemplates from "@/components/marketing-crm/EmailTemplates";
import CampaignManager from "@/components/marketing-crm/CampaignManager";
import LeadPipeline from "@/components/marketing-crm/LeadPipeline";
import Analytics from "@/components/marketing-crm/Analytics";
import InboxComponent from "@/components/marketing-crm/Inbox";

// Per Thomas's directive: Marketing team uses Instantly.ai directly for list/template/sequence building.
// TBP CRM focuses on analytics + tracking (pulling data via API).
// Hidden tabs: Sequences, Templates, Inbox (kept in codebase, just not shown in nav).
const TAB_CONFIG: { id: MarketingTab; label: string; icon: typeof Users; hidden?: boolean }[] = [
  { id: "contacts", label: "Contact Hub", icon: Users },
  { id: "sequences", label: "Sequences", icon: Mail, hidden: true },
  { id: "templates", label: "Templates", icon: FileText, hidden: true },
  { id: "approvals", label: "Approvals", icon: ShieldCheck },
  { id: "inbox", label: "Inbox", icon: InboxIcon, hidden: true },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "pipeline", label: "Pipeline", icon: Kanban },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

const VISIBLE_TABS = TAB_CONFIG.filter((t) => !t.hidden);

export default function MarketingCrmPage() {
  const [activeTab, setActiveTab] = useState<MarketingTab>("contacts");
  const [pendingCount, setPendingCount] = useState(0);
  const [darkMode, setDarkMode] = useState(false);

  // Dark mode: sync with <html> class
  useEffect(() => {
    const saved = localStorage.getItem("tbp-dark-mode");
    if (saved === "true" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("tbp-dark-mode", String(next));
  }

  useEffect(() => {
    fetch("/api/marketing-crm/approvals")
      .then((r) => r.json())
      .then((json) => {
        const pending = (json.data ?? []).filter(
          (a: { status: string }) => a.status === "pending"
        );
        setPendingCount(pending.length);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 dark:bg-[#1a1d21]">
      <div className="mx-auto max-w-7xl">
        {/* Back nav + dark mode toggle */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Portal
          </Link>
          <button
            onClick={toggleDarkMode}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-[#2a2d32] dark:hover:text-slate-200"
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Module 03: Marketing CRM
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            B2B outreach pipeline — contacts, sequences, campaigns &amp; lead
            pipeline for US dealer acquisition.
          </p>
        </header>

        {/* Tab bar */}
        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-[#2a2d32]">
          {VISIBLE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.id === "approvals" && pendingCount > 0 && (
                  <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active tab content */}
        {activeTab === "contacts" && <ContactHub />}
        {activeTab === "sequences" && <SequenceBuilder />}
        {activeTab === "templates" && <EmailTemplates />}
        {activeTab === "approvals" && <ApprovalCenter />}
        {activeTab === "inbox" && <InboxComponent />}
        {activeTab === "campaigns" && <CampaignManager />}
        {activeTab === "pipeline" && <LeadPipeline />}
        {activeTab === "analytics" && <Analytics />}
      </div>
    </div>
  );
}
