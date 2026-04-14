"use client";

import { useEffect, useState, DragEvent } from "react";
import {
  GripVertical,
  Users,
  DollarSign,
  TrendingUp,
  X,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import type { PipelineLead, LeadStage } from "@/types/marketing";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STAGES: {
  id: LeadStage;
  label: string;
  borderColor: string;
  headerBg: string;
  valueBg: string;
  countBg: string;
}[] = [
  { id: "cold", label: "Cold", borderColor: "border-t-slate-400", headerBg: "bg-slate-50 dark:bg-slate-500/10", valueBg: "text-slate-700 dark:text-slate-300", countBg: "bg-white/80 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300" },
  { id: "warm", label: "Warm", borderColor: "border-t-amber-400", headerBg: "bg-amber-50 dark:bg-amber-500/10", valueBg: "text-amber-700 dark:text-amber-400", countBg: "bg-white/80 dark:bg-amber-700/30 text-amber-700 dark:text-amber-300" },
  { id: "hot", label: "Hot", borderColor: "border-t-orange-400", headerBg: "bg-orange-50 dark:bg-orange-500/10", valueBg: "text-orange-700 dark:text-orange-400", countBg: "bg-white/80 dark:bg-orange-700/30 text-orange-700 dark:text-orange-300" },
  { id: "sql", label: "SQL", borderColor: "border-t-blue-400", headerBg: "bg-blue-50 dark:bg-blue-500/10", valueBg: "text-blue-700 dark:text-blue-400", countBg: "bg-white/80 dark:bg-blue-700/30 text-blue-700 dark:text-blue-300" },
  { id: "deal", label: "Deal", borderColor: "border-t-green-400", headerBg: "bg-green-50 dark:bg-green-500/10", valueBg: "text-green-700 dark:text-green-400", countBg: "bg-white/80 dark:bg-green-700/30 text-green-700 dark:text-green-300" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatUsd(n: number): string {
  if (n >= 100_000) return `$${Math.round(n / 1000)}k`;
  if (n >= 1_000) return `$${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `$${n.toLocaleString("en-US")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LeadPipeline() {
  /* ---- state ---- */
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editDealValue, setEditDealValue] = useState("");
  const [editStage, setEditStage] = useState<LeadStage>("cold");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  /* ---- data fetching ---- */
  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing-crm/leads");
      if (!res.ok) throw new Error("Failed to fetch leads");
      const json = await res.json();
      setLeads(json.data ?? []);
    } catch {
      showToast("Failed to load leads", "error");
    } finally {
      setLoading(false);
    }
  }

  /* ---- toast ---- */
  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  /* ---- helpers ---- */
  function stageLeads(stage: LeadStage) {
    return leads.filter((l) => l.stage === stage);
  }

  const totalLeads = leads.length;
  const totalValue = leads.reduce((s, l) => s + (l.deal_value ?? 0), 0);
  const avgDeal = totalLeads > 0 ? totalValue / totalLeads : 0;

  /* ---- drag & drop ---- */
  function handleDragStart(e: DragEvent<HTMLDivElement>, leadId: string) {
    setDraggedLead(leadId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>, stage: LeadStage) {
    e.preventDefault();
    if (dragOverStage !== stage) setDragOverStage(stage);
  }

  function handleDragLeave() {
    setDragOverStage(null);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>, targetStage: LeadStage) {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedLead) return;
    const lead = leads.find((l) => l.id === draggedLead);
    if (!lead || lead.stage === targetStage) {
      setDraggedLead(null);
      return;
    }

    setLeads((prev) =>
      prev.map((l) =>
        l.id === draggedLead ? { ...l, stage: targetStage } : l
      )
    );

    const stageLabel = STAGES.find((s) => s.id === targetStage)?.label ?? targetStage;
    showToast(`Moved "${lead.contact_name}" to ${stageLabel}`);
    setDraggedLead(null);

    // persist in background
    fetch("/api/marketing-crm/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: draggedLead, stage: targetStage }),
    }).catch(() => showToast("Failed to save stage change", "error"));
  }

  function handleDragEnd() {
    setDraggedLead(null);
    setDragOverStage(null);
  }

  /* ---- modal ---- */
  function openDetail(lead: PipelineLead) {
    setSelectedLead(lead);
    setEditNotes(lead.notes ?? "");
    setEditDealValue(lead.deal_value != null ? String(lead.deal_value) : "");
    setEditStage(lead.stage);
  }

  function closeDetail() {
    setSelectedLead(null);
  }

  async function saveDetail() {
    if (!selectedLead) return;

    const updated: PipelineLead = {
      ...selectedLead,
      notes: editNotes || null,
      deal_value: editDealValue ? Number(editDealValue) : null,
      stage: editStage,
    };

    setLeads((prev) =>
      prev.map((l) => (l.id === updated.id ? updated : l))
    );
    setSelectedLead(null);
    showToast("Lead updated");

    try {
      await fetch("/api/marketing-crm/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: updated.id,
          notes: updated.notes,
          deal_value: updated.deal_value,
          stage: updated.stage,
        }),
      });
    } catch {
      showToast("Failed to save changes", "error");
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- Pipeline header ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Lead Pipeline</h2>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-[#2a2f38] dark:bg-[#1a1f28]">
            <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Leads</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{totalLeads}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-[#2a2f38] dark:bg-[#1a1f28]">
            <DollarSign className="h-4 w-4 text-green-500 dark:text-green-400" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Deal Value</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{formatUsd(totalValue)}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-[#2a2f38] dark:bg-[#1a1f28]">
            <TrendingUp className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Avg Deal Size</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{formatUsd(Math.round(avgDeal))}</span>
          </div>
        </div>
      </div>

      {/* ---- Kanban board ---- */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const items = stageLeads(stage.id);
          const stageValue = items.reduce(
            (s, l) => s + (l.deal_value ?? 0),
            0
          );
          const isOver = dragOverStage === stage.id;

          return (
            <div
              key={stage.id}
              className={`flex w-72 min-w-[288px] flex-shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm transition-all dark:border-[#2a2f38] dark:bg-[#141720] ${
                isOver ? "ring-2 ring-blue-400 bg-blue-50/50 dark:bg-blue-500/5" : ""
              }`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column header */}
              <div
                className={`rounded-t-xl border-t-4 ${stage.borderColor} ${stage.headerBg} px-4 py-3`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                    {stage.label}
                  </h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${stage.countBg}`}>
                    {items.length}
                  </span>
                </div>
                <p className={`mt-1 text-sm font-semibold ${stage.valueBg}`}>
                  {formatUsd(stageValue)}
                </p>
              </div>

              {/* Cards container */}
              <div className="flex min-h-[200px] flex-col gap-2 p-3">
                {items.length === 0 && (
                  <p className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                    No leads
                  </p>
                )}

                {items.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => openDetail(lead)}
                    className={`group flex cursor-pointer gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md dark:border-[#2a2f38] dark:bg-[#1a1f28] dark:hover:bg-[#1e2330] ${
                      draggedLead === lead.id ? "opacity-50" : ""
                    }`}
                  >
                    {/* Drag handle */}
                    <div className="flex flex-shrink-0 items-start pt-0.5">
                      <GripVertical className="h-4 w-4 cursor-grab text-slate-300 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400" />
                    </div>

                    {/* Card body */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {lead.contact_name}
                      </p>
                      <p className="truncate text-sm text-slate-600 dark:text-slate-400">
                        {lead.company}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-500">
                        {lead.title}
                      </p>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        {lead.deal_value != null && lead.deal_value > 0 && (
                          <span
                            className={`text-sm font-semibold ${stage.valueBg}`}
                          >
                            {formatUsd(lead.deal_value)}
                          </span>
                        )}
                        <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                          {formatDate(lead.last_activity)}
                        </span>
                      </div>

                      {lead.state && (
                        <span className="mt-1.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700/50 dark:text-slate-400">
                          {lead.state}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- Lead detail modal ---- */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 dark:bg-black/60">
          <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#2a2f38] dark:bg-[#1a1f28]">
            <button
              onClick={closeDetail}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[#2a2f38] dark:hover:text-slate-300"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {selectedLead.contact_name}
            </h3>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              {selectedLead.company}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500 dark:text-slate-500">Title</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{selectedLead.title}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-500">Email</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{selectedLead.email}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-500">State</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{selectedLead.state ?? "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-500">Source Campaign</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{selectedLead.source_campaign ?? "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-500">Last Activity</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{formatDate(selectedLead.last_activity)}</p>
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
              {selectedLead.notes && (
                <div className="mb-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-[#141720] dark:text-slate-300">
                  {selectedLead.notes}
                </div>
              )}
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                placeholder="Add or edit notes..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-[#2a2f38] dark:bg-[#141720] dark:text-white dark:placeholder-slate-500"
              />
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Deal Value ($)</label>
              <input
                type="number"
                min={0}
                value={editDealValue}
                onChange={(e) => setEditDealValue(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-[#2a2f38] dark:bg-[#141720] dark:text-white dark:placeholder-slate-500"
              />
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Move to Stage</label>
              <select
                value={editStage}
                onChange={(e) => setEditStage(e.target.value as LeadStage)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-[#2a2f38] dark:bg-[#141720] dark:text-white"
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeDetail}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-[#2a2f38] dark:text-slate-300 dark:hover:bg-[#2a2f38]"
              >
                Close
              </button>
              <button
                onClick={saveDetail}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Toast notification ---- */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
