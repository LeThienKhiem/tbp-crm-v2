"use client";

import { useState, useEffect, useCallback } from "react";
import EmailPreview from "./EmailPreview";
import {
  Plus,
  Eye,
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
  Rocket,
  RefreshCw,
} from "lucide-react";
import type {
  Sequence,
  SequenceStep,
  SequenceStatus,
  SequenceTypeId,
  TargetSegment,
  StepType,
  EmailVariant,
} from "@/types/marketing";

// ── Spintax utilities ────────────────────────────────────────────

/** Resolve all {A|B|C} spintax in a string, picking random variants.
 *  Preserves {{personalization}} variables intact. */
function resolveSpintax(text: string): string {
  // First protect {{variables}} by replacing with placeholders
  const vars: string[] = [];
  const protected_ = text.replace(/\{\{([^}]+)\}\}/g, (_m, v: string) => {
    vars.push(v);
    return `__VAR_${vars.length - 1}__`;
  });
  // Now resolve spintax {A|B|C}
  const resolved = protected_.replace(/\{([^{}]+)\}/g, (_match, group: string) => {
    const options = group.split("|");
    if (options.length <= 1) return `{${group}}`; // not spintax, preserve
    return options[Math.floor(Math.random() * options.length)];
  });
  // Restore {{variables}}
  return resolved.replace(/__VAR_(\d+)__/g, (_m, idx: string) => `{{${vars[parseInt(idx)]}}}`);
}

/** Count how many unique spintax combinations exist */
function countSpintaxVariations(text: string): number {
  // Strip {{variables}} first so they don't get counted
  const stripped = text.replace(/\{\{[^}]+\}\}/g, "");
  let count = 1;
  const regex = /\{([^{}]+)\}/g;
  let m;
  while ((m = regex.exec(stripped)) !== null) {
    const options = m[1].split("|");
    if (options.length > 1) count *= options.length;
  }
  return count;
}

/** Insert spintax at end of text (append) — simple and React-safe */
function appendSpintax(currentText: string, snippet: string): string {
  if (!currentText) return snippet;
  if (currentText.endsWith("\n") || currentText.endsWith(" ")) return currentText + snippet;
  return currentText + " " + snippet;
}

const VARIANT_LABELS = ["A", "B", "C", "D", "E"];
const VARIANT_COLORS = [
  "border-blue-300 bg-blue-50 text-blue-700",
  "border-orange-300 bg-orange-50 text-orange-700",
  "border-green-300 bg-green-50 text-green-700",
  "border-purple-300 bg-purple-50 text-purple-700",
  "border-pink-300 bg-pink-50 text-pink-700",
];
const VARIANT_TAB_ACTIVE = [
  "bg-blue-600 text-white",
  "bg-orange-600 text-white",
  "bg-green-600 text-white",
  "bg-purple-600 text-white",
  "bg-pink-600 text-white",
];

const SPINTAX_SNIPPETS = [
  { label: "Greeting", value: "{Hi|Hello|Hey}" },
  { label: "CTA", value: "{Would you be open to|Could we schedule|Any interest in}" },
  { label: "Timeframe", value: "{this week|next week|soon}" },
  { label: "Meeting", value: "{a quick call|a brief chat|a 15-minute conversation}" },
  { label: "Closing", value: "{Best|Cheers|Thanks|Regards}" },
];

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
  { id: "priority_instantly", label: "Priority Outreach", tool: "Instantly.ai", badge: "bg-blue-50 text-blue-700 ring-blue-300" },
  { id: "nurture_instantly", label: "Warm Nurture", tool: "Instantly.ai", badge: "bg-blue-50 text-blue-700 ring-blue-300" },
];

const SEGMENT_OPTIONS: { id: TargetSegment; label: string }[] = [
  { id: "distributors", label: "Distributors" },
  { id: "private_label", label: "Private Label" },
  { id: "top_50_priority", label: "Top 50 Priority" },
  { id: "custom", label: "Custom List" },
];

const US_STATES: { abbr: string; name: string }[] = [
  { abbr: "AL", name: "Alabama" }, { abbr: "AK", name: "Alaska" }, { abbr: "AZ", name: "Arizona" },
  { abbr: "AR", name: "Arkansas" }, { abbr: "CA", name: "California" }, { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" }, { abbr: "DE", name: "Delaware" }, { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" }, { abbr: "HI", name: "Hawaii" }, { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" }, { abbr: "IN", name: "Indiana" }, { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" }, { abbr: "KY", name: "Kentucky" }, { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" }, { abbr: "MD", name: "Maryland" }, { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" }, { abbr: "MN", name: "Minnesota" }, { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" }, { abbr: "MT", name: "Montana" }, { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" }, { abbr: "NH", name: "New Hampshire" }, { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" }, { abbr: "NY", name: "New York" }, { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" }, { abbr: "OH", name: "Ohio" }, { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" }, { abbr: "PA", name: "Pennsylvania" }, { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" }, { abbr: "SD", name: "South Dakota" }, { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" }, { abbr: "UT", name: "Utah" }, { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" }, { abbr: "WA", name: "Washington" }, { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" }, { abbr: "WY", name: "Wyoming" },
];

// ── Email Templates ─────────────────────────────────────────────
const EMAIL_TEMPLATES: { id: string; label: string; subject: string; body: string; templateFile?: string }[] = [
  {
    id: "cold_intro",
    label: "⭐ Cold Intro — Premium HTML Template",
    subject: "TBP Auto — Premium Brake Drums for {{company_name}}",
    body: `Hi {{first_name}},

I noticed {{company_name}} operates a significant fleet across the US. With Chinese brake drum duties now exceeding 446%, many fleet operators are looking for alternative, cost-effective suppliers.

At TBP Auto, we manufacture premium brake drums in Vietnam — identical quality to what you're sourcing today, but with zero anti-dumping duties and competitive FOB pricing.

Would you be open to a quick 15-minute call this week? I'd love to share our catalog and a sample pricing sheet for your most-used part numbers.

Best,
Thomas Nguyen
TBP Auto`,
    templateFile: "/email-templates/01-cold-outreach.html",
  },
  {
    id: "follow_up",
    label: "⭐ Follow-up — Cost Savings HTML Template",
    subject: "Your Cost Savings Breakdown — {{company_name}}",
    body: `Hi {{first_name}},

I put together a quick comparison showing what {{company_name}} could save by switching to Vietnamese-origin brake drums. The numbers speak for themselves.

Chinese-origin: $38,400/container (with 446% AD/CVD duty)
TBP Auto (Vietnam): $14,200/container (0% duty)
Your estimated savings: $21,400 per container.

Would you like to see a full custom quote for {{company_name}}'s top 10 part numbers?

Best,
Thomas`,
    templateFile: "/email-templates/02-follow-up-value.html",
  },
  {
    id: "last_chance",
    label: "Last Touch — Free Sample",
    subject: "Quick question about {{company_name}}'s brake drum sourcing",
    body: `Hi {{first_name}},

One last reach-out \u2014 we have a special introductory offer for new fleet customers: free sample shipment + 10% off first order.

If now isn\u2019t the right time, no worries. But if you\u2019re evaluating brake drum suppliers, I\u2019d welcome the chance to earn your business.

Best,
Thomas`,
  },
  {
    id: "trade_show",
    label: "Trade Show Follow-up",
    subject: "Great meeting you at the show, {{first_name}}",
    body: `Hi {{first_name}},

It was great connecting at the trade show. As discussed, TBP Auto manufactures high-quality brake drums with direct US shipping from our Vietnam facility.

I\u2019ve attached our latest catalog. Would you like to schedule a follow-up call?

Best,
Thomas`,
  },
  {
    id: "reengagement",
    label: "Re-engagement \u2014 New Products",
    subject: "New: TBP Auto 2025 product line + US warehouse update",
    body: `Hi {{first_name}},

Hope you\u2019re doing well. Wanted to share some exciting news \u2014 TBP Auto has expanded our 2025 brake drum line and now offers local US warehouse fulfillment for faster delivery.

Would this change the equation for {{company_name}}?

Best,
Thomas`,
  },
  {
    id: "special_pricing",
    label: "Special Pricing Offer",
    subject: "Special pricing for {{company_name}} \u2014 limited time",
    body: `Hi {{first_name}},

I wanted to extend a special Q2 pricing offer for {{company_name}}: 15% off your first container order + free ocean freight.

This is available through end of Q2. Let me know if you\u2019d like details.

Best,
Thomas`,
  },
];

// Mock contact count based on segment + state count
function estimateContacts(segments: TargetSegment[], states: string[]): number {
  if (segments.length === 0 || states.length === 0) return 0;
  // Known legacy segments get hardcoded estimates; dynamic groups get 10 per group as placeholder
  const segBase: Record<string, number> = { distributors: 18, private_label: 12, top_50_priority: 8, custom: 15 };
  const base = segments.reduce((sum, s) => sum + (segBase[s] ?? 10), 0);
  return Math.round(base * states.length * (0.8 + Math.random() * 0.4));
}

function getSeqTypeMeta(id: SequenceTypeId) {
  return SEQUENCE_TYPES.find((t) => t.id === id) ?? SEQUENCE_TYPES[0];
}

function getSegmentLabel(id: TargetSegment) {
  return SEGMENT_OPTIONS.find((s) => s.id === id)?.label ?? id; // falls back to name itself (which is the label for dynamic groups)
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

// ── Spintax Toolbar ─────────────────────────────────────────────

function SpintaxToolbar({ text, onInsert }: { text: string; onInsert: (snippet: string) => void }) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const variations = countSpintaxVariations(text);
  const hasSpintax = variations > 1;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Spintax:</span>
      {SPINTAX_SNIPPETS.map((s) => (
        <button key={s.label} type="button"
          onClick={() => onInsert(s.value)}
          className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors"
          title={`Insert: ${s.value}`}
        >
          {s.label}
        </button>
      ))}
      {hasSpintax && (
        <>
          <span className="ml-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
            {variations} variations
          </span>
          <button type="button"
            onClick={() => { setPreviewText(resolveSpintax(text)); setShowPreview(!showPreview); }}
            className="rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 hover:bg-violet-100 transition-colors"
          >
            {showPreview ? "Hide" : "Preview"} random
          </button>
        </>
      )}
      {showPreview && previewText && (
        <div className="mt-1 w-full rounded-lg border border-violet-200 bg-violet-50/50 p-2.5 text-xs text-violet-900 whitespace-pre-wrap">
          <div className="mb-1 text-[10px] font-semibold uppercase text-violet-500">Random preview:</div>
          {previewText}
          <button type="button"
            onClick={() => setPreviewText(resolveSpintax(text))}
            className="ml-2 inline-flex items-center gap-1 text-[10px] font-medium text-violet-600 hover:text-violet-800"
          >
            <RefreshCw size={10} /> Shuffle
          </button>
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
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);

  const iconMap: Record<StepType, React.ReactNode> = {
    email: <Mail size={16} className="text-blue-600" />,
    wait: <Clock size={16} className="text-amber-600" />,
    condition: <GitBranch size={16} className="text-purple-600" />,
  };
  const bgMap: Record<StepType, string> = {
    email: "bg-blue-50", wait: "bg-amber-50", condition: "bg-purple-50",
  };

  // Get current variants (backwards compat: single subject/body → 1 variant)
  const variants: EmailVariant[] = step.type === "email"
    ? (step.variants && step.variants.length > 0
      ? step.variants
      : [{ id: "v_a", label: "A", subject: step.subject ?? "", body: step.body ?? "", templateFile: step.templateFile }])
    : [];

  const currentVariant = variants[activeVariantIdx] ?? variants[0];

  // Sync variants back to step
  function updateVariant(idx: number, partial: Partial<EmailVariant>) {
    const updated = variants.map((v, i) => (i === idx ? { ...v, ...partial } : v));
    // Also keep subject/body on step for backwards compat (first variant)
    const first = idx === 0 ? { ...updated[0] } : updated[0];
    onChange({
      ...step,
      variants: updated,
      subject: first.subject,
      body: first.body,
      templateFile: first.templateFile,
    });
  }

  function addVariant() {
    if (variants.length >= 5) return;
    const idx = variants.length;
    const newVariant: EmailVariant = {
      id: `v_${Date.now()}`,
      label: VARIANT_LABELS[idx] ?? String(idx + 1),
      subject: currentVariant?.subject ?? "",
      body: "",
    };
    onChange({ ...step, variants: [...variants, newVariant] });
    setActiveVariantIdx(idx);
  }

  function removeVariant(idx: number) {
    if (variants.length <= 1) return;
    const updated = variants.filter((_, i) => i !== idx).map((v, i) => ({ ...v, label: VARIANT_LABELS[i] ?? String(i + 1) }));
    const newIdx = Math.min(activeVariantIdx, updated.length - 1);
    setActiveVariantIdx(newIdx);
    onChange({
      ...step,
      variants: updated,
      subject: updated[0]?.subject ?? "",
      body: updated[0]?.body ?? "",
      templateFile: updated[0]?.templateFile,
    });
  }

  function duplicateVariant() {
    if (variants.length >= 5) return;
    const idx = variants.length;
    const dup: EmailVariant = {
      ...currentVariant,
      id: `v_${Date.now()}`,
      label: VARIANT_LABELS[idx] ?? String(idx + 1),
    };
    onChange({ ...step, variants: [...variants, dup] });
    setActiveVariantIdx(idx);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgMap[step.type]}`}>
            {iconMap[step.type]}
          </span>
          <span className="text-sm font-semibold capitalize text-slate-800">{step.type} Step</span>
          <span className="text-xs text-slate-400">#{step.order + 1}</span>
          {step.type === "email" && variants.length > 1 && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
              A/B Test · {variants.length} variants
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onMoveUp} disabled={step.order === 0} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"><ChevronUp size={16} /></button>
          <button onClick={onMoveDown} disabled={step.order === totalSteps - 1} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"><ChevronDown size={16} /></button>
          <button onClick={onDelete} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"><X size={16} /></button>
        </div>
      </div>

      {step.type === "email" && (() => {
        const variantSubject = currentVariant?.subject ?? "";
        const variantBody = currentVariant?.body ?? "";
        const activeTemplate = EMAIL_TEMPLATES.find((t) =>
          t.subject === variantSubject && t.body === variantBody
        );
        const fullText = `${variantSubject}\n${variantBody}`;

        return (
          <div className="space-y-3">
            {/* ── A/B Variant Tabs ── */}
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
              {variants.map((v, i) => (
                <div key={v.id} role="button" tabIndex={0}
                  onClick={() => setActiveVariantIdx(i)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setActiveVariantIdx(i); }}
                  className={`relative cursor-pointer rounded-t-lg px-3 py-1.5 text-xs font-bold transition-colors select-none ${
                    i === activeVariantIdx
                      ? VARIANT_TAB_ACTIVE[i % VARIANT_TAB_ACTIVE.length]
                      : `border ${VARIANT_COLORS[i % VARIANT_COLORS.length]} hover:opacity-80`
                  }`}
                >
                  Variant {v.label}
                  {variants.length > 1 && i === activeVariantIdx && (
                    <span role="button" tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); removeVariant(i); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); removeVariant(i); } }}
                      className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/30 text-[10px] hover:bg-white/60 cursor-pointer"
                    >×</span>
                  )}
                </div>
              ))}
              {variants.length < 5 && (
                <div className="flex items-center gap-1 ml-1">
                  <button type="button" onClick={addVariant}
                    className="rounded-lg border border-dashed border-slate-300 px-2 py-1 text-[10px] font-medium text-slate-500 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                    title="Add A/B variant"
                  >
                    + Variant
                  </button>
                  <button type="button" onClick={duplicateVariant}
                    className="rounded-lg border border-dashed border-slate-300 px-2 py-1 text-[10px] font-medium text-slate-500 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    title="Duplicate current variant"
                  >
                    <Copy size={10} className="inline mr-0.5" />Duplicate
                  </button>
                </div>
              )}
              {variants.length > 1 && (
                <span className="ml-auto text-[10px] text-slate-400">
                  Instantly splits traffic evenly
                </span>
              )}
            </div>

            {/* ── Template selector + From ── */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Lock size={12} /><span>From: thomas@outreach.tbpauto.com</span>
              </div>
              <select
                value={activeTemplate?.id ?? ""}
                onChange={(e) => {
                  const tpl = EMAIL_TEMPLATES.find((t) => t.id === e.target.value);
                  if (tpl) updateVariant(activeVariantIdx, { subject: tpl.subject, body: tpl.body, templateFile: tpl.templateFile });
                }}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none transition-colors ${
                  activeTemplate
                    ? "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                <option value="">Use template...</option>
                {EMAIL_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>{t.id === activeTemplate?.id ? "✓ " : ""}{t.label}</option>
                ))}
              </select>
            </div>
            {activeTemplate && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
                <CheckCircle size={12} className="shrink-0" />
                <span>Using template: <strong>{activeTemplate.label.replace(/⭐\s*/, "")}</strong></span>
                {activeTemplate.templateFile && (
                  <span className="ml-auto rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase">HTML</span>
                )}
              </div>
            )}

            {/* ── Subject ── */}
            <input type="text" placeholder="Subject line... Use {Option A|Option B} for spintax"
              value={variantSubject}
              onChange={(e) => updateVariant(activeVariantIdx, { subject: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />

            {/* ── Body ── */}
            <textarea
              placeholder="Email body... Use {{first_name}}, {{company_name}} for personalization. Use {Hi|Hello|Hey} for spintax."
              rows={4} value={variantBody}
              onChange={(e) => updateVariant(activeVariantIdx, { body: e.target.value })}
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />

            {/* ── Spintax Toolbar ── */}
            <SpintaxToolbar text={fullText} onInsert={(snippet) => {
              updateVariant(activeVariantIdx, { body: appendSpintax(variantBody, snippet) });
            }} />
          </div>
        );
      })()}

      {step.type === "wait" && (
        <div className="flex items-center gap-2">
          <input type="number" min={1} value={step.wait_days ?? 2}
            onChange={(e) => onChange({ ...step, wait_days: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-20 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
          <span className="text-sm text-slate-600">days</span>
        </div>
      )}

      {step.type === "condition" && (
        <select value={step.condition ?? "opened_previous"}
          onChange={(e) => onChange({ ...step, condition: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
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

// ── State Multi-Select Dropdown ─────────────────────────────────

function StateMultiSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (states: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = US_STATES.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.abbr.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(abbr: string) {
    onChange(
      selected.includes(abbr)
        ? selected.filter((s) => s !== abbr)
        : [...selected, abbr]
    );
  }

  function selectAll() {
    onChange(US_STATES.map((s) => s.abbr));
  }

  function clearAll() {
    onChange([]);
  }

  const getStateName = (abbr: string) =>
    US_STATES.find((s) => s.abbr === abbr)?.name ?? abbr;

  return (
    <div className="relative">
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        Target States * <span className="font-normal text-slate-400">({selected.length} selected)</span>
      </label>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm outline-none hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      >
        <span className={selected.length > 0 ? "text-slate-900" : "text-slate-500"}>
          {selected.length === 0
            ? "Select target states..."
            : selected.length <= 5
              ? selected.map((s) => `${getStateName(s)} (${s})`).join(", ")
              : `${selected.length} states selected`}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((abbr) => (
            <span
              key={abbr}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
            >
              {abbr} — {getStateName(abbr)}
              <button
                type="button"
                onClick={() => toggle(abbr)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-blue-200"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {/* Search */}
          <div className="border-b border-slate-100 p-2">
            <input
              type="text"
              placeholder="Search states..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-1.5">
            <button type="button" onClick={selectAll} className="text-xs font-medium text-blue-600 hover:text-blue-800">
              Select All
            </button>
            <span className="text-slate-300">|</span>
            <button type="button" onClick={clearAll} className="text-xs font-medium text-slate-500 hover:text-slate-700">
              Clear All
            </button>
            <span className="text-slate-300">|</span>
            <button type="button" onClick={() => setOpen(false)} className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-700">
              Done
            </button>
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.map((state) => {
              const isSelected = selected.includes(state.abbr);
              return (
                <button
                  key={state.abbr}
                  type="button"
                  onClick={() => toggle(state.abbr)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    isSelected
                      ? "bg-blue-50 text-blue-800"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                    isSelected
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300"
                  }`}>
                    {isSelected && "\u2713"}
                  </span>
                  <span className="font-medium">{state.name}</span>
                  <span className="text-slate-400">({state.abbr})</span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-slate-400">No states match &ldquo;{search}&rdquo;</p>
            )}
          </div>
        </div>
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
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState<Sequence | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSequence, setPreviewSequence] = useState<Sequence | null>(null);

  // ── Contact Groups (dynamic segments) ─────────────────────────
  const [contactGroups, setContactGroups] = useState<{ id: string; name: string; color: string }[]>([]);

  useEffect(() => {
    fetch("/api/marketing-crm/contact-groups")
      .then((r) => r.json())
      .then((json) => {
        const groups = (json.data ?? []).map((g: { id: string; name: string; color: string }) => ({
          id: g.name, // use name as segment ID for readability in Airtable
          name: g.name,
          color: g.color,
        }));
        setContactGroups(groups);
      })
      .catch(() => {});
  }, []);

  const segmentOptions = contactGroups.length > 0
    ? contactGroups.map((g) => ({ id: g.id as TargetSegment, label: g.name }))
    : SEGMENT_OPTIONS; // fallback to hardcoded if no groups yet

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

  async function handleDuplicate(seq: Sequence) {
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
    try {
      await fetch("/api/marketing-crm/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dup),
      });
      setSequences((prev) => [...prev, dup]);
      showToastMsg("Sequence duplicated");
    } catch {
      showToastMsg("Failed to duplicate");
    }
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
        const json = await res.json();
        const saved = json.data ?? updated;
        // Merge Airtable record ID back so future saves update instead of create
        const merged = { ...updated, id: saved.id ?? updated.id, _recordId: saved._recordId ?? (updated as Record<string, unknown>)._recordId };
        setSequences((prev) => {
          const idx = prev.findIndex((s) => s.id === updated.id || s.id === merged.id);
          return idx >= 0 ? prev.map((s) => (s.id === updated.id || s.id === merged.id ? merged as Sequence : s)) : [...prev, merged as Sequence];
        });
        setActiveSequence(merged as Sequence);
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
      // 1. Save sequence with pending_approval status
      const res = await fetch("/api/marketing-crm/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) { showToastMsg("Failed to submit"); return; }
      const seqJson = await res.json();
      const savedSeq = seqJson.data ?? updated;
      const seqRecordId = savedSeq._recordId ?? savedSeq.id ?? updated.id;

      // 2. Create approval item
      const segLabels: Record<string, string> = { distributors: "Distributors", private_label: "Private Label", top_50_priority: "Top 50 Priority", custom: "Custom List" };
      const approvalItem = {
        type: "sequence",
        reference_id: seqRecordId,
        title: updated.name,
        description: `${updated.steps.length}-step ${updated.sequence_type.replace("_instantly", "")} sequence via Instantly.ai targeting ${updated.target_segments.map(s => segLabels[s] || s).join(", ")} in ${updated.target_states.join(", ")}. ~${updated.estimated_contacts} contacts.`,
        submitted_by: updated.created_by || "Khiem",
        submitted_at: new Date().toISOString(),
        status: "pending",
        sequence_detail: {
          sequence_type: updated.sequence_type,
          target_segments: updated.target_segments,
          target_states: updated.target_states,
          estimated_contacts: updated.estimated_contacts,
          send_from_domain: updated.send_from_domain,
          steps: updated.steps.map(s => ({
            type: s.type,
            subject: s.subject,
            body: s.body,
            templateFile: s.templateFile,
            wait_days: s.wait_days,
            condition: s.condition,
          })),
        },
      };
      await fetch("/api/marketing-crm/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approvalItem),
      });

      setSequences((prev) => {
        const idx = prev.findIndex((s) => s.id === updated.id);
        return idx >= 0 ? prev.map((s) => (s.id === updated.id ? updated : s)) : [...prev, updated];
      });
      setActiveSequence(updated);
      setShowSubmitModal(false);
      showToastMsg("Submitted for approval");
    } catch {
      showToastMsg("Failed to submit");
    }
  }

  // ── Deploy to Instantly ────────────────────────────────────
  async function handleDeploy() {
    if (!showDeployModal) return;
    setDeploying(true);
    try {
      // Convert sequence steps to Instantly format
      const sequences = showDeployModal.steps
        .filter((s) => s.type === "email")
        .map((step, i) => {
          // Find wait step before this email (if any)
          const prevSteps = showDeployModal.steps.slice(0, showDeployModal.steps.findIndex((s) => s.id === step.id));
          const lastWait = [...prevSteps].reverse().find((s) => s.type === "wait");
          // Build variants array — supports A/B testing
          const stepVariants = (step.variants && step.variants.length > 0)
            ? step.variants.map((v) => ({ subject: v.subject || "", body: v.body || "" }))
            : [{ subject: step.subject || "", body: step.body || "" }];
          return {
            delay: i === 0 ? 0 : (lastWait?.wait_days ?? 3),
            delay_unit: "day",
            variants: stepVariants,
          };
        });

      const res = await fetch("/api/marketing-crm/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: showDeployModal.name,
          sequences,
          daily_limit: 50,
          // Extra fields for Airtable tracking
          sequence_id: showDeployModal._recordId ?? showDeployModal.id,
          sequence_name: showDeployModal.name,
          deployed_by: "Marketing Team",
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Deploy failed");
      }

      showToastMsg(`"${showDeployModal.name}" deployed to Instantly as a campaign!`);
      setShowDeployModal(null);
    } catch (err: unknown) {
      showToastMsg(err instanceof Error ? err.message : "Failed to deploy");
    } finally {
      setDeploying(false);
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
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
                options={segmentOptions}
                selected={activeSequence.target_segments}
                onChange={(v) => updateTargeting({ target_segments: v })}
                label="Target Segments *"
              />
            </div>

            {/* Target States — multi-select dropdown */}
            <div className="md:col-span-2">
              <StateMultiSelect
                selected={activeSequence.target_states}
                onChange={(states) => updateTargeting({ target_states: states })}
              />
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
          <button onClick={() => { setPreviewSequence(activeSequence); setShowPreview(true); }}
            className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">
            <Eye size={14} /> Preview Emails
          </button>
          <button onClick={openSubmitModal}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
            <Send size={14} /> Submit for Approval
          </button>
        </div>

        {/* Email Preview Modal */}
        {showPreview && previewSequence && (
          <EmailPreview
            steps={previewSequence.steps}
            sequenceName={previewSequence.name}
            fromEmail={`thomas@${previewSequence.send_from_domain}`}
            onClose={() => setShowPreview(false)}
          />
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  //  DEPLOY TO INSTANTLY MODAL
  // ════════════════════════════════════════════════════════════
  const deployModal = showDeployModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <Rocket size={18} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Deploy to Instantly.ai</h3>
            <p className="text-sm text-slate-500">Create a campaign from this sequence</p>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Sequence</span>
            <span className="font-semibold text-slate-900">{showDeployModal.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Email Steps</span>
            <span className="text-slate-700">{showDeployModal.steps.filter((s) => s.type === "email").length}</span>
          </div>
          {(() => {
            const abSteps = showDeployModal.steps.filter((s) => s.type === "email" && s.variants && s.variants.length > 1);
            return abSteps.length > 0 ? (
              <div className="flex justify-between">
                <span className="text-slate-500">A/B Tests</span>
                <span className="flex items-center gap-1.5 text-orange-700">
                  <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold">A/B</span>
                  {abSteps.length} step{abSteps.length > 1 ? "s" : ""} with {abSteps.reduce((s, st) => s + (st.variants?.length ?? 1), 0)} variants
                </span>
              </div>
            ) : null;
          })()}
          <div className="flex justify-between">
            <span className="text-slate-500">Target</span>
            <span className="text-slate-700">
              {showDeployModal.target_segments.map(getSegmentLabel).join(", ")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">States</span>
            <span className="text-slate-700">{showDeployModal.target_states.join(", ")}</span>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          This will create a new campaign in Instantly.ai as a Draft. You can then add leads and launch it from the Campaigns tab.
        </p>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button onClick={() => setShowDeployModal(null)}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button onClick={handleDeploy} disabled={deploying}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {deploying ? <RefreshCw size={14} className="animate-spin" /> : <Rocket size={14} />}
            {deploying ? "Deploying..." : "Deploy to Instantly"}
          </button>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  //  LIST VIEW
  // ════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {toastEl}
      {deployModal}

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
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <button onClick={() => setActiveSequence(seq)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Edit3 size={14} /> Edit
                  </button>
                  <button onClick={() => { setPreviewSequence(seq); setShowPreview(true); }}
                    className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">
                    <Eye size={14} /> Preview
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
                  {(seq.status === "approved" || seq.status === "active") && (
                    <button onClick={() => setShowDeployModal(seq)}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                      <Rocket size={14} /> Deploy
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Email Preview Modal (from list view) */}
      {showPreview && previewSequence && (
        <EmailPreview
          steps={previewSequence.steps}
          sequenceName={previewSequence.name}
          fromEmail={`thomas@${previewSequence.send_from_domain}`}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
