"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Mail,
  Clock,
  GitBranch,
  ChevronUp,
  ChevronDown,
  X,
  ArrowLeft,
  Copy,
  Edit3,
  Send,
  Lock,
  Layers,
  ChevronRight,
} from "lucide-react";
import type {
  Sequence,
  SequenceStep,
  SequenceStatus,
  StepType,
} from "@/types/marketing";

// ── Helpers ──────────────────────────────────────────────────────

const STATUS_BADGES: Record<SequenceStatus, string> = {
  draft: "bg-slate-50 text-slate-700 ring-slate-300",
  pending_approval: "bg-amber-50 text-amber-700 ring-amber-300",
  approved: "bg-green-50 text-green-700 ring-green-300",
  active: "bg-blue-50 text-blue-700 ring-blue-300",
  paused: "bg-orange-50 text-orange-700 ring-orange-300",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-300",
};

const STATUS_LABELS: Record<SequenceStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

function generateId(): string {
  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createBlankStep(type: StepType, order: number): SequenceStep {
  const base = { id: generateId(), order, type };
  if (type === "email") return { ...base, subject: "", body: "" };
  if (type === "wait") return { ...base, wait_days: 2 };
  return { ...base, condition: "opened_previous" };
}

function reindex(steps: SequenceStep[]): SequenceStep[] {
  return steps.map((s, i) => ({ ...s, order: i }));
}

// ── Add-Step Dropdown ────────────────────────────────────────────

function AddStepButton({ onAdd }: { onAdd: (type: StepType) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex justify-center">
      <button
        onClick={() => setOpen(!open)}
        className="z-10 flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-500 hover:border-blue-400 hover:text-blue-600"
      >
        <Plus size={12} /> Add
      </button>
      {open && (
        <div className="absolute top-8 z-20 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {(["email", "wait", "condition"] as StepType[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                onAdd(t);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {t === "email" && <Mail size={14} />}
              {t === "wait" && <Clock size={14} />}
              {t === "condition" && <GitBranch size={14} />}
              <span className="capitalize">{t}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Step Card ────────────────────────────────────────────────────

function StepCard({
  step,
  totalSteps,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  step: SequenceStep;
  totalSteps: number;
  onChange: (updated: SequenceStep) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const iconMap: Record<StepType, React.ReactNode> = {
    email: <Mail size={16} className="text-blue-600" />,
    wait: <Clock size={16} className="text-amber-600" />,
    condition: <GitBranch size={16} className="text-purple-600" />,
  };

  const bgMap: Record<StepType, string> = {
    email: "bg-blue-50",
    wait: "bg-amber-50",
    condition: "bg-purple-50",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgMap[step.type]}`}>
            {iconMap[step.type]}
          </span>
          <span className="text-sm font-semibold capitalize text-slate-800">
            {step.type} Step
          </span>
          <span className="text-xs text-slate-400">#{step.order + 1}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={step.order === 0}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
          >
            <ChevronUp size={16} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={step.order === totalSteps - 1}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
          >
            <ChevronDown size={16} />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Email */}
      {step.type === "email" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Lock size={12} />
            <span>From: thomas@outreach.tbpauto.com</span>
          </div>
          <input
            type="text"
            placeholder="Subject line..."
            value={step.subject ?? ""}
            onChange={(e) => onChange({ ...step, subject: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          <textarea
            placeholder="Email body..."
            rows={4}
            value={step.body ?? ""}
            onChange={(e) => onChange({ ...step, body: e.target.value })}
            className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      )}

      {/* Wait */}
      {step.type === "wait" && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={step.wait_days ?? 2}
            onChange={(e) =>
              onChange({ ...step, wait_days: Math.max(1, parseInt(e.target.value) || 1) })
            }
            className="w-20 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          <span className="text-sm text-slate-600">days</span>
        </div>
      )}

      {/* Condition */}
      {step.type === "condition" && (
        <select
          value={step.condition ?? "opened_previous"}
          onChange={(e) => onChange({ ...step, condition: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="opened_previous">Opened previous email</option>
          <option value="clicked_previous">Clicked in previous email</option>
          <option value="replied">Replied to sequence</option>
        </select>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────

export default function SequenceBuilder() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSequence, setActiveSequence] = useState<Sequence | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ── Fetch ───────────────────────────────────────────────────
  const fetchSequences = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/marketing-crm/sequences");
      if (res.ok) {
        const json = await res.json();
        setSequences(json.data ?? []);
      }
    } catch {
      showToast("Failed to load sequences");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ── Sequence CRUD ───────────────────────────────────────────
  function handleNew() {
    const seq: Sequence = {
      id: `seq_${Date.now()}`,
      name: "New Sequence",
      description: "",
      steps: [createBlankStep("email", 0)],
      status: "draft",
      send_from_domain: "outreach.tbpauto.com",
      created_by: "current_user",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setActiveSequence(seq);
  }

  function handleDuplicate(seq: Sequence) {
    const dup: Sequence = {
      ...seq,
      id: `seq_${Date.now()}`,
      name: `${seq.name} (Copy)`,
      status: "draft",
      approved_by: null,
      approved_at: null,
      steps: seq.steps.map((s) => ({ ...s, id: generateId() })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSequences((prev) => [...prev, dup]);
    showToast("Sequence duplicated");
  }

  async function handleSaveDraft() {
    if (!activeSequence) return;
    const updated = { ...activeSequence, status: "draft" as const, updated_at: new Date().toISOString() };
    try {
      const res = await fetch("/api/marketing-crm/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setSequences((prev) => {
          const idx = prev.findIndex((s) => s.id === updated.id);
          return idx >= 0
            ? prev.map((s) => (s.id === updated.id ? updated : s))
            : [...prev, updated];
        });
        setActiveSequence(updated);
        showToast("Draft saved");
      } else {
        showToast("Failed to save draft");
      }
    } catch {
      showToast("Failed to save draft");
    }
  }

  async function handleSubmitForApproval() {
    if (!activeSequence) return;
    const updated: Sequence = {
      ...activeSequence,
      status: "pending_approval",
      updated_at: new Date().toISOString(),
    };
    try {
      const res = await fetch("/api/marketing-crm/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setSequences((prev) => {
          const idx = prev.findIndex((s) => s.id === updated.id);
          return idx >= 0
            ? prev.map((s) => (s.id === updated.id ? updated : s))
            : [...prev, updated];
        });
        setActiveSequence(updated);
        showToast("Submitted for approval");
      } else {
        showToast("Failed to submit");
      }
    } catch {
      showToast("Failed to submit");
    }
  }

  // ── Step mutations ──────────────────────────────────────────
  function updateStep(updated: SequenceStep) {
    if (!activeSequence) return;
    setActiveSequence({
      ...activeSequence,
      steps: activeSequence.steps.map((s) => (s.id === updated.id ? updated : s)),
    });
  }

  function addStep(type: StepType, afterIndex: number) {
    if (!activeSequence) return;
    const newStep = createBlankStep(type, afterIndex + 1);
    const steps = [...activeSequence.steps];
    steps.splice(afterIndex + 1, 0, newStep);
    setActiveSequence({ ...activeSequence, steps: reindex(steps) });
  }

  function removeStep(id: string) {
    if (!activeSequence) return;
    const steps = activeSequence.steps.filter((s) => s.id !== id);
    setActiveSequence({ ...activeSequence, steps: reindex(steps) });
  }

  function moveStep(index: number, direction: -1 | 1) {
    if (!activeSequence) return;
    const steps = [...activeSequence.steps];
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    [steps[index], steps[target]] = [steps[target], steps[index]];
    setActiveSequence({ ...activeSequence, steps: reindex(steps) });
  }

  // ── Toast ──────────────────────────────────────────────────
  const toastEl = toast && (
    <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-800 px-4 py-2.5 text-sm text-white shadow-lg">
      {toast}
    </div>
  );

  // ════════════════════════════════════════════════════════════
  //  EDITOR VIEW
  // ════════════════════════════════════════════════════════════
  if (activeSequence) {
    return (
      <div className="space-y-6">
        {toastEl}

        {/* Back */}
        <button
          onClick={() => setActiveSequence(null)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Back to sequences
        </button>

        {/* Name + Description */}
        <div className="space-y-3">
          <input
            type="text"
            value={activeSequence.name}
            onChange={(e) => setActiveSequence({ ...activeSequence, name: e.target.value })}
            className="w-full border-none bg-transparent text-xl font-semibold text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Sequence name..."
          />
          <textarea
            value={activeSequence.description ?? ""}
            onChange={(e) => setActiveSequence({ ...activeSequence, description: e.target.value })}
            rows={2}
            placeholder="Brief description of this sequence..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Domain banner */}
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <Lock size={16} className="shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            All emails send from <span className="font-semibold">outreach.tbpauto.com</span>
          </p>
        </div>

        {/* Step timeline */}
        <div className="relative space-y-0">
          {/* Vertical line */}
          {activeSequence.steps.length > 1 && (
            <div className="absolute left-5 top-4 -z-0 h-[calc(100%-2rem)] w-px bg-slate-200" />
          )}

          {activeSequence.steps.map((step, idx) => (
            <div key={step.id}>
              <div className="relative z-10 pl-12">
                {/* Timeline dot */}
                <div className="absolute left-3.5 top-5 h-3 w-3 rounded-full border-2 border-white bg-slate-300 shadow-sm" />

                <StepCard
                  step={step}
                  totalSteps={activeSequence.steps.length}
                  onChange={updateStep}
                  onMoveUp={() => moveStep(idx, -1)}
                  onMoveDown={() => moveStep(idx, 1)}
                  onDelete={() => removeStep(step.id)}
                />
              </div>

              {/* Add-step between cards */}
              <div className="relative z-10 my-3 pl-12">
                <AddStepButton onAdd={(type) => addStep(type, idx)} />
              </div>
            </div>
          ))}

          {/* Add-step when empty */}
          {activeSequence.steps.length === 0 && (
            <div className="flex justify-center py-8">
              <AddStepButton onAdd={(type) => addStep(type, -1)} />
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
          <button
            onClick={handleSaveDraft}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Save Draft
          </button>
          <button
            onClick={handleSubmitForApproval}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Send size={14} /> Submit for Approval
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  //  LIST VIEW
  // ════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {toastEl}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={20} className="text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">Email Sequences</h2>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} /> New Sequence
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-12 text-center text-sm text-slate-500">Loading sequences...</div>
      )}

      {/* Empty */}
      {!loading && sequences.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <Mail size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-500">No sequences yet. Create your first one.</p>
        </div>
      )}

      {/* Card grid */}
      {!loading && sequences.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {sequences.map((seq) => (
            <div
              key={seq.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-slate-900">{seq.name}</h3>
                  {seq.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                      {seq.description}
                    </p>
                  )}
                </div>
                <span
                  className={`ml-2 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_BADGES[seq.status]}`}
                >
                  {STATUS_LABELS[seq.status]}
                </span>
              </div>

              <div className="mb-3 flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Layers size={12} /> {seq.steps.length} step{seq.steps.length !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <ChevronRight size={12} /> {seq.status}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSequence(seq)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Edit3 size={14} /> Edit
                </button>
                <button
                  onClick={() => handleDuplicate(seq)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Copy size={14} /> Duplicate
                </button>
                {seq.status === "draft" && (
                  <button
                    onClick={() => {
                      setActiveSequence(seq);
                      setTimeout(() => handleSubmitForApproval(), 0);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <Send size={14} /> Submit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
