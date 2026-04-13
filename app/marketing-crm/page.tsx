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

const TAB_CONFIG: { id: MarketingTab; label: string; icon: typeof Users }[] = [
  { id: "contacts", label: "Contact Hub", icon: Users },
  { id: "sequences", label: "Sequences", icon: Mail },
  { id: "templates", label: "Templates", icon: FileText },
  { id: "approvals", label: "Approvals", icon: ShieldCheck },
  { id: "inbox", label: "Inbox", icon: InboxIcon },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "pipeline", label: "Pipeline", icon: Kanban },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

export default function MarketingCrmPage() {
  const [activeTab, setActiveTab] = useState<MarketingTab>("contacts");
  const [pendingCount, setPendingCount] = useState(0);

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
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Back nav */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Portal
        </Link>

        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Module 03: Marketing CRM
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            B2B outreach pipeline — contacts, sequences, campaigns &amp; lead
            pipeline for US dealer acquisition.
          </p>
        </header>

        {/* Tab bar */}
        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
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
