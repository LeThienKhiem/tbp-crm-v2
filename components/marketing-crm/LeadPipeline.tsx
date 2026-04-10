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
}[] = [
  { id: "cold", label: "Cold", borderColor: "border-t-slate-400", headerBg: "bg-slate-50", valueBg: "text-slate-700" },
  { id: "warm", label: "Warm", borderColor: "border-t-amber-400", headerBg: "bg-amber-50", valueBg: "text-amber-700" },
  { id: "hot", label: "Hot", borderColor: "border-t-orange-400", headerBg: "bg-orange-50", valueBg: "text-orange-700" },
  { id: "sql", label: "SQL", borderColor: "border-t-blue-400", headerBg: "bg-blue-50", valueBg: "text-blue-700" },
  { id: "deal", label: "Deal", borderColor: "border-t-green-400", headerBg: "bg-green-50", valueBg: "text-green-700" },
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
        <h2 className="text-xl font-semibold text-slate-900">Lead Pipeline</h2>

        <div className="flex flex-wrap items-center gap-4">
          {/* Total leads */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <Users className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-600">Total Leads</span>
            <span className="text-sm font-semibold text-slate-900">
              {totalLeads}
            </span>
          </div>

          {/* Total value */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <DollarSign className="h-4 w-4 text-green-500" />
            <span className="text-sm text-slate-600">Total Deal Value</span>
            <span className="text-sm font-semibold text-slate-900">
              {formatUsd(totalValue)}
            </span>
          </div>

          {/* Avg deal */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-slate-600">Avg Deal Size</span>
            <span className="text-sm font-semibold text-slate-900">
              {formatUsd(Math.round(avgDeal))}
            </span>
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
              className={`flex w-72 min-w-[288px] flex-shrink-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-all ${
                isOver ? "ring-2 ring-blue-400 bg-blue-50/50" : ""
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
                  <h3 className="text-sm font-semibold text-slate-800">
                    {stage.label}
                  </h3>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {items.length}
                  </span>
                </div>
                <p className={`mt-1 text-xs font-medium ${stage.valueBg}`}>
                  {formatUsd(stageValue)}
                </p>
              </div>

              {/* Cards container */}
              <div className="flex min-h-[200px] flex-col gap-2 p-3">
                {items.length === 0 && (
                  <p className="py-8 text-center text-xs text-slate-400">
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
                    className={`group flex cursor-pointer gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md ${
                      draggedLead === lead.id ? "opacity-50" : ""
                    }`}
                  >
                    {/* Drag handle */}
                    <div className="flex flex-shrink-0 items-start pt-0.5">
                      <GripVertical className="h-4 w-4 cursor-grab text-slate-300 group-hover:text-slate-500" />
                    </div>

                    {/* Card body */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {lead.contact_name}
                      </p>
                      <p className="truncate text-sm text-slate-600">
                        {lead.company}
                      </p>
                      <p className="truncate text-xs text-slate-500">
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
                        <span className="ml-auto text-xs text-slate-400">
                          {formatDate(lead.last_activity)}
                        </span>
                      </div>

                      {lead.state && (
                        <span className="mt-1.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            {/* Close button */}
            <button
              onClick={closeDetail}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-semibold text-slate-900">
              {selectedLead.contact_name}
            </h3>
            <p className="mt-0.5 text-sm text-slate-600">
              {selectedLead.company}
            </p>

            {/* Contact info grid */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500">Title</span>
                <p className="font-medium text-slate-800">
                  {selectedLead.title}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Email</span>
                <p className="font-medium text-slate-800">
                  {selectedLead.email}
                </p>
              </div>
              <div>
                <span className="text-slate-500">State</span>
                <p className="font-medium text-slate-800">
                  {selectedLead.state ?? "N/A"}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Source Campaign</span>
                <p className="font-medium text-slate-800">
                  {selectedLead.source_campaign ?? "N/A"}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Last Activity</span>
                <p className="font-medium text-slate-800">
                  {formatDate(selectedLead.last_activity)}
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-5">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Notes
              </label>
              {selectedLead.notes && (
                <div className="mb-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  {selectedLead.notes}
                </div>
              )}
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                placeholder="Add or edit notes..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Deal value */}
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Deal Value ($)
              </label>
              <input
                type="number"
                min={0}
                value={editDealValue}
                onChange={(e) => setEditDealValue(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Move to Stage */}
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Move to Stage
              </label>
              <select
                value={editStage}
                onChange={(e) => setEditStage(e.target.value as LeadStage)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeDetail}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
