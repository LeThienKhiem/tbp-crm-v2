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
  Users,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Zap,
} from "lucide-react";
import type {
  Sequence,
  SequenceStep,
  SequenceStatus,
  SequenceTypeId,
  TargetSegment,
  StepType,
} from "@/types/marketing";

// ── Constants ────────────────────────────────────────────────────

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

const SEQUENCE_TYPES: {
  id: SequenceTypeId;
  label: string;
  tool: string;
  badge: string;
}[] = [
  { id: "cold_instantly", label: "Cold Outreach", tool: "Instantly.ai", badge: "bg-blue-50 text-blue-700 ring-blue-300" },
  { id: "priority_lemlist", label: "Priority Outreach", tool: "Lemlist", badge: "bg-purple-50 text-purple-700 ring-purple-300" },
  { id: "nurture_activecampaign", label: "Warm Nurture", tool: "ActiveCampaign", badge: "bg-green-50 text-green-700 ring-green-300" },
];

const SEGMENT_OPTIONS: { id: TargetSegment; label: string }[] = [
  { id: "distributors", label: "Distributors" },
  { id: "private_label", label: "Private Label" },
  { id: "top_50_priority", label: "Top 50 Priority" },
  { id: "custom", label: "Custom List" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

// Mock contact count based on segment + state count
function estimateContacts(segments: TargetSegment[], states: string[]): number {
  if (segments.length === 0 || states.length === 0) return 0;
  const segBase: Record<TargetSegment, number> = { distributors: 18, private_label: 12, top_50_priority: 8, custom: 15 };
  const base = segments.reduce((sum, s) => sum + segBase[s], 0);
  return Math.round(base * states.length * (0.8 + Math.random() * 0.4));
}

function getSeqTypeMeta(id: SequenceTypeId) {
  return SEQUENCE_TYPES.find((t) => t.id === id) ?? SEQUENCE_TYPES[0];
}

function getSegmentLabel(id: TargetSegment) {
  return SEGMENT_OPTIONS.find((s) => s.id === id)?.label ?? id;
}

// ── Helpers ──────────────────────────────────────────────────────

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
              onClick={() => { onAdd(t); setOpen(false); }}
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
  step, totalSteps, onChange, onMoveUp, onMoveDown, onDelete,
}: {
  step: SequenceStep; totalSteps: number;
  onChange: (u: SequenceStep) => void;
  onMoveUp: () => void; onMoveDown: () => void; onDelete: () => void;
}) {
  const iconMap: Record<StepType, React.ReactNode> = {
    email: <Mail size={16} className="text-blue-600" />,
    wait: <Clock size={16} className="text-amber-600" />,
    condition: <GitBranch size={16} className="text-purple-600" />,
  };
  const bgMap: Record<StepType, string> = {
    email: "bg-blue-50", wait: "bg-amber-50", condition: "bg-purple-50",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgMap[step.type]}`}>
            {iconMap[step.type]}
          </span>
          <span className="text-sm font-semibold capitalize text-slate-800">{step.type} Step</span>
          <span className="text-xs text-slate-400">#{step.order + 1}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onMoveUp} disabled={step.order === 0} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"><ChevronUp size={16} /></button>
          <button onClick={onMoveDown} disabled={step.order === totalSteps - 1} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"><ChevronDown size={16} /></button>
          <button onClick={onDelete} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"><X size={16} /></button>
        </div>
      </div>

      {step.type === "email" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Lock size={12} /><span>From: thomas@outreach.tbpauto.com</span>
          </div>
          <input type="text" placeholder="Subject line..." value={step.subject ?? ""}
            onChange={(e) => onChange({ ...step, subject: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
          <textarea placeholder="Email body..." rows={4} value={step.body ?? ""}
            onChange={(e) => onChange({ ...step, body: e.target.value })}
            className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
        </div>
      )}

      {step.type === "wait" && (
        <div className="flex items-center gap-2">
          <input type="number" min={1} value={step.wait_days ?? 2}
            onChange={(e) => onChange({ ...step, wait_days: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-20 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
          <span className="text-sm text-slate-600">days</span>
        </div>
      )}

      {step.type === "condition" && (
        <select value={step.condition ?? "opened_previous"}
          onChange={(e) => onChange({ ...step, condition: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
          <option value="opened_previous">Opened previous email</option>
          <option value="clicked_previous">Clicked in previous email</option>
          <option value="replied">Replied to sequence</option>
        </select>
      )}
    </div>
  );
}

// ── Multi-select pill helper ─────────────────────────────────────

function MultiPill<T extends string>({
  options, selected, onChange, label,
}: {
  options: { id: T; label: string }[]; selected: T[];
  onChange: (v: T[]) => void; label: string;
}) {
  const toggle = (id: T) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = selected.includes(o.id);
          return (
            <button key={o.id} type="button" onClick={() => toggle(o.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >{o.label}</button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────

export default function SequenceBuilder() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSequence, setActiveSequence] = useState<Sequence | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────
  const fetchSequences = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/marketing-crm/sequences");
      if (res.ok) {
        const json = await res.json();
        setSequences(json.data ?? []);
      }
    } catch {
      showToastMsg("Failed to load sequences");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSequences(); }, [fetchSequences]);

  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  // ── Sequence CRUD ──────────────────────────────────────────
  function handleNew() {
    const seq: Sequence = {
      id: `seq_${Date.now()}`,
      name: "New Sequence",
      description: "",
      sequence_type: "cold_instantly",
      target_segments: [],
      target_states: [],
      estimated_contacts: 0,
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
    showToastMsg("Sequence duplicated");
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
          return idx >= 0 ? prev.map((s) => (s.id === updated.id ? updated : s)) : [...prev, updated];
        });
        setActiveSequence(updated);
        showToastMsg("Draft saved");
      } else {
        showToastMsg("Failed to save draft");
      }
    } catch {
      showToastMsg("Failed to save draft");
    }
  }

  function openSubmitModal() {
    if (!activeSequence) return;
    if (activeSequence.target_segments.length === 0) { showToastMsg("Select at least one target segment"); return; }
    if (activeSequence.target_states.length === 0) { showToastMsg("Select at least one target state"); return; }
    setShowSubmitModal(true);
  }

  async function confirmSubmit() {
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
          return idx >= 0 ? prev.map((s) => (s.id === updated.id ? updated : s)) : [...prev, updated];
        });
        setActiveSequence(updated);
        setShowSubmitModal(false);
        showToastMsg("Submitted for approval");
      } else {
        showToastMsg("Failed to submit");
      }
    } catch {
      showToastMsg("Failed to submit");
    }
  }

  // ── Step mutations ─────────────────────────────────────────
  function updateStep(updated: SequenceStep) {
    if (!activeSequence) return;
    setActiveSequence({ ...activeSequence, steps: activeSequence.steps.map((s) => (s.id === updated.id ? updated : s)) });
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
    setActiveSequence({ ...activeSequence, steps: reindex(activeSequence.steps.filter((s) => s.id !== id)) });
  }
  function moveStep(index: number, direction: -1 | 1) {
    if (!activeSequence) return;
    const steps = [...activeSequence.steps];
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    [steps[index], steps[target]] = [steps[target], steps[index]];
    setActiveSequence({ ...activeSequence, steps: reindex(steps) });
  }

  // ── Update estimated contacts when segments/states change ──
  function updateTargeting(partial: Partial<Pick<Sequence, "target_segments" | "target_states" | "sequence_type">>) {
    if (!activeSequence) return;
    const merged = { ...activeSequence, ...partial };
    merged.estimated_contacts = estimateContacts(merged.target_segments, merged.target_states);
    setActiveSequence(merged);
  }

  // ── Toast ──────────────────────────────────────────────────
  const toastEl = toast && (
    <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-800 px-4 py-2.5 text-sm text-white shadow-lg">
      {toast}
    </div>
  );

  // ════════════════════════════════════════════════════════════
  //  SUBMIT CONFIRMATION MODAL
  // ════════════════════════════════════════════════════════════
  const submitModal = showSubmitModal && activeSequence && (() => {
    const meta = getSeqTypeMeta(activeSequence.sequence_type);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <Send size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Submit for Approval</h3>
              <p className="text-sm text-slate-500">Review before submitting</p>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Sequence</span>
              <span className="text-sm font-semibold text-slate-900">{activeSequence.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Send Tool</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${meta.badge}`}>
                {meta.label} — {meta.tool}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Target Segment</span>
              <span className="text-sm font-medium text-slate-700">
                {activeSequence.target_segments.map(getSegmentLabel).join(", ")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Target States</span>
              <span className="text-sm font-medium text-slate-700">
                {activeSequence.target_states.join(", ")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Est. Contacts</span>
              <span className="text-sm font-semibold text-slate-900">{activeSequence.estimated_contacts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Steps</span>
              <span className="text-sm text-slate-700">{activeSequence.steps.length} steps</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Send From</span>
              <span className="flex items-center gap-1 text-sm font-medium text-slate-700">
                <Lock size={12} className="text-amber-600" /> outreach.tbpauto.com
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle size={16} className="shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              This will be sent to <span className="font-semibold">Thomas</span> for approval before any emails are sent.
            </p>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button onClick={() => setShowSubmitModal(false)}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
            <button onClick={confirmSubmit}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
              <CheckCircle size={16} /> Confirm &amp; Submit
            </button>
          </div>
        </div>
      </div>
    );
  })();

  // ════════════════════════════════════════════════════════════
  //  EDITOR VIEW
  // ════════════════════════════════════════════════════════════
  if (activeSequence) {
    const currentMeta = getSeqTypeMeta(activeSequence.sequence_type);
    return (
      <div className="space-y-6">
        {toastEl}
        {submitModal}

        {/* Back */}
        <button onClick={() => setActiveSequence(null)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} /> Back to sequences
        </button>

        {/* Name + Description */}
        <div className="space-y-3">
          <input type="text" value={activeSequence.name}
            onChange={(e) => setActiveSequence({ ...activeSequence, name: e.target.value })}
            className="w-full border-none bg-transparent text-xl font-semibold text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Sequence name..." />
          <textarea value={activeSequence.description ?? ""}
            onChange={(e) => setActiveSequence({ ...activeSequence, description: e.target.value })}
            rows={2} placeholder="Brief description of this sequence..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
        </div>

        {/* ── Targeting fields ─────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Zap size={16} className="text-blue-600" /> Targeting &amp; Delivery
          </h3>
          <div className="grid gap-5 md:grid-cols-2">
            {/* Sequence Type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Sequence Type *</label>
              <select value={activeSequence.sequence_type}
                onChange={(e) => updateTargeting({ sequence_type: e.target.value as SequenceTypeId })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                {SEQUENCE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label} ({t.tool})</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                Sends via <span className="font-medium">{currentMeta.tool}</span>
              </p>
            </div>

            {/* Estimated contacts (read-only) */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Estimated Contacts</label>
              <div className="flex h-[42px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                <Users size={14} className="text-slate-400" />
                <span className="font-semibold">{activeSequence.estimated_contacts}</span>
                <span className="text-slate-400">contacts</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">Auto-calculated from segments + states</p>
            </div>

            {/* Target Segments */}
            <div className="md:col-span-2">
              <MultiPill<TargetSegment>
                options={SEGMENT_OPTIONS}
                selected={activeSequence.target_segments}
                onChange={(v) => updateTargeting({ target_segments: v })}
                label="Target Segments *"
              />
            </div>

            {/* Target States */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Target States * <span className="font-normal text-slate-400">({activeSequence.target_states.length} selected)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {US_STATES.map((st) => {
                  const active = activeSequence.target_states.includes(st);
                  return (
                    <button key={st} type="button"
                      onClick={() => {
                        const states = active
                          ? activeSequence.target_states.filter((s) => s !== st)
                          : [...activeSequence.target_states, st];
                        updateTargeting({ target_states: states });
                      }}
                      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                        active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >{st}</button>
                  );
                })}
              </div>
            </div>
          </div>
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
          {activeSequence.steps.length > 1 && (
            <div className="absolute left-5 top-4 -z-0 h-[calc(100%-2rem)] w-px bg-slate-200" />
          )}
          {activeSequence.steps.map((step, idx) => (
            <div key={step.id}>
              <div className="relative z-10 pl-12">
                <div className="absolute left-3.5 top-5 h-3 w-3 rounded-full border-2 border-white bg-slate-300 shadow-sm" />
                <StepCard step={step} totalSteps={activeSequence.steps.length}
                  onChange={updateStep}
                  onMoveUp={() => moveStep(idx, -1)}
                  onMoveDown={() => moveStep(idx, 1)}
                  onDelete={() => removeStep(step.id)} />
              </div>
              <div className="relative z-10 my-3 pl-12">
                <AddStepButton onAdd={(type) => addStep(type, idx)} />
              </div>
            </div>
          ))}
          {activeSequence.steps.length === 0 && (
            <div className="flex justify-center py-8">
              <AddStepButton onAdd={(type) => addStep(type, -1)} />
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
          <button onClick={handleSaveDraft}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Save Draft
          </button>
          <button onClick={openSubmitModal}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
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
        <button onClick={handleNew}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
          <Plus size={16} /> New Sequence
        </button>
      </div>

      {loading && <div className="py-12 text-center text-sm text-slate-500">Loading sequences...</div>}

      {!loading && sequences.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <Mail size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-500">No sequences yet. Create your first one.</p>
        </div>
      )}

      {/* Card grid */}
      {!loading && sequences.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {sequences.map((seq) => {
            const meta = getSeqTypeMeta(seq.sequence_type);
            return (
              <div key={seq.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                {/* Row 1: Name + Status */}
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-slate-900">{seq.name}</h3>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_BADGES[seq.status]}`}>
                    {STATUS_LABELS[seq.status]}
                  </span>
                </div>

                {/* Row 2: Sequence Type badge */}
                <div className="mb-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${meta.badge}`}>
                    <Zap size={10} /> {meta.label} — {meta.tool}
                  </span>
                </div>

                {/* Row 3: Description snippet */}
                {seq.description && (
                  <p className="mb-3 line-clamp-2 text-xs text-slate-500">{seq.description}</p>
                )}

                {/* Row 4: Targeting info */}
                <div className="mb-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Users size={12} className="shrink-0 text-slate-400" />
                    <span className="font-medium text-slate-700">{seq.estimated_contacts} contacts</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin size={12} className="shrink-0 text-slate-400" />
                    <span>
                      {seq.target_segments.map(getSegmentLabel).join(", ")}
                      {seq.target_states.length > 0 && (
                        <span className="text-slate-400"> — {seq.target_states.join(", ")}</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Layers size={12} className="shrink-0 text-slate-400" />
                    <span>{seq.steps.length} step{seq.steps.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                {/* Row 5: Actions */}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                  <button onClick={() => setActiveSequence(seq)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Edit3 size={14} /> Edit
                  </button>
                  <button onClick={() => handleDuplicate(seq)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Copy size={14} /> Duplicate
                  </button>
                  {seq.status === "draft" && (
                    <button onClick={() => { setActiveSequence(seq); setTimeout(() => openSubmitModal(), 0); }}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                      <Send size={14} /> Submit
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
