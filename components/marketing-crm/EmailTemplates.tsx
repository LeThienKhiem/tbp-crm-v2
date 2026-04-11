"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Edit3,
  Eye,
  Copy,
  Trash2,
  X,
  Save,
  FileText,
  Sparkles,
  Code,
  Mail,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Monitor,
  Smartphone,
} from "lucide-react";

// ── Template Data ───────────────────────────────────────────────
interface EmailTemplate {
  id: string;
  name: string;
  category: "cold_outreach" | "follow_up" | "nurture" | "trade_show" | "special";
  subject: string;
  bodyPlain: string;
  htmlFile?: string;
  htmlContent?: string;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  cold_outreach: { label: "Cold Outreach", color: "bg-blue-50 text-blue-700 ring-blue-200" },
  follow_up: { label: "Follow-up", color: "bg-amber-50 text-amber-700 ring-amber-200" },
  nurture: { label: "Nurture", color: "bg-green-50 text-green-700 ring-green-200" },
  trade_show: { label: "Trade Show", color: "bg-purple-50 text-purple-700 ring-purple-200" },
  special: { label: "Special Offer", color: "bg-red-50 text-red-700 ring-red-200" },
};

// ── Initial templates (matches SequenceBuilder EMAIL_TEMPLATES) ──
const INITIAL_TEMPLATES: EmailTemplate[] = [
  {
    id: "cold_intro",
    name: "Cold Intro — Premium Brake Drums",
    category: "cold_outreach",
    subject: "TBP Auto — Premium Brake Drums for {{company_name}}",
    bodyPlain: `Hi {{first_name}},

I noticed {{company_name}} operates a significant fleet across the US. With Chinese brake drum duties now exceeding 446%, many fleet operators are looking for alternative, cost-effective suppliers.

At TBP Auto, we manufacture premium brake drums in Vietnam — identical quality to what you're sourcing today, but with zero anti-dumping duties and competitive FOB pricing.

Would you be open to a quick 15-minute call this week? I'd love to share our catalog and a sample pricing sheet for your most-used part numbers.

Best,
Thomas Nguyen
TBP Auto`,
    htmlFile: "/email-templates/01-cold-outreach.html",
    createdAt: "2025-04-01",
    updatedAt: "2025-04-10",
  },
  {
    id: "follow_up",
    name: "Follow-up — Cost Savings Calculator",
    category: "follow_up",
    subject: "Your Cost Savings Breakdown — {{company_name}}",
    bodyPlain: `Hi {{first_name}},

I put together a quick comparison showing what {{company_name}} could save by switching to Vietnamese-origin brake drums. The numbers speak for themselves.

Chinese-origin: $38,400/container (with 446% AD/CVD duty)
TBP Auto (Vietnam): $14,200/container (0% duty)
Your estimated savings: $21,400 per container.

Would you like to see a full custom quote for {{company_name}}'s top 10 part numbers?

Best,
Thomas`,
    htmlFile: "/email-templates/02-follow-up-value.html",
    createdAt: "2025-04-01",
    updatedAt: "2025-04-10",
  },
  {
    id: "last_chance",
    name: "Last Touch — Free Sample Offer",
    category: "cold_outreach",
    subject: "Quick question about {{company_name}}'s brake drum sourcing",
    bodyPlain: `Hi {{first_name}},

One last reach-out — we have a special introductory offer for new fleet customers: free sample shipment + 10% off first order.

If now isn't the right time, no worries. But if you're evaluating brake drum suppliers, I'd welcome the chance to earn your business.

Best,
Thomas`,
    createdAt: "2025-04-02",
    updatedAt: "2025-04-08",
  },
  {
    id: "trade_show",
    name: "Trade Show Follow-up",
    category: "trade_show",
    subject: "Great meeting you at the show, {{first_name}}",
    bodyPlain: `Hi {{first_name}},

It was great connecting at the trade show. As discussed, TBP Auto manufactures high-quality brake drums with direct US shipping from our Vietnam facility.

I've attached our latest catalog. Would you like to schedule a follow-up call?

Best,
Thomas`,
    createdAt: "2025-04-03",
    updatedAt: "2025-04-03",
  },
  {
    id: "reengagement",
    name: "Re-engagement — New Products",
    category: "nurture",
    subject: "New: TBP Auto 2025 product line + US warehouse update",
    bodyPlain: `Hi {{first_name}},

Hope you're doing well. Wanted to share some exciting news — TBP Auto has expanded our 2025 brake drum line and now offers local US warehouse fulfillment for faster delivery.

Would this change the equation for {{company_name}}?

Best,
Thomas`,
    createdAt: "2025-04-04",
    updatedAt: "2025-04-04",
  },
  {
    id: "special_pricing",
    name: "Special Pricing Offer — Q2",
    category: "special",
    subject: "Special pricing for {{company_name}} — limited time",
    bodyPlain: `Hi {{first_name}},

I wanted to extend a special Q2 pricing offer for {{company_name}}: 15% off your first container order + free ocean freight.

This is available through end of Q2. Let me know if you'd like details.

Best,
Thomas`,
    createdAt: "2025-04-05",
    updatedAt: "2025-04-05",
  },
];

// ── Preview Variables ───────────────────────────────────────────
const PREVIEW_VARS: Record<string, string> = {
  "{{first_name}}": "David",
  "{{last_name}}": "Thompson",
  "{{company}}": "National Fleet Services",
  "{{company_name}}": "National Fleet Services",
  "{{title}}": "Fleet Manager",
  "{{city}}": "Houston",
  "{{state}}": "Texas",
};

function replaceVars(text: string): string {
  let result = text;
  for (const [key, value] of Object.entries(PREVIEW_VARS)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════
export default function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(INITIAL_TEMPLATES);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [previewing, setPreviewing] = useState<EmailTemplate | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Filter templates
  const filtered = filter === "all" ? templates : templates.filter((t) => t.category === filter);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function handleSave(updated: EmailTemplate) {
    setTemplates((prev) =>
      prev.map((t) => (t.id === updated.id ? { ...updated, updatedAt: new Date().toISOString().split("T")[0] } : t))
    );
    setEditing(null);
    showToast(`Template "${updated.name}" saved`);
  }

  function handleDuplicate(template: EmailTemplate) {
    const dup: EmailTemplate = {
      ...template,
      id: `${template.id}_copy_${Date.now()}`,
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    };
    setTemplates((prev) => [...prev, dup]);
    showToast(`Duplicated "${template.name}"`);
  }

  function handleDelete(id: string) {
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    if (!confirm(`Delete "${tpl.name}"? This cannot be undone.`)) return;
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    showToast(`Deleted "${tpl.name}"`);
  }

  function handleCreate() {
    const newTemplate: EmailTemplate = {
      id: `custom_${Date.now()}`,
      name: "New Email Template",
      category: "cold_outreach",
      subject: "",
      bodyPlain: "",
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    };
    setTemplates((prev) => [...prev, newTemplate]);
    setEditing(newTemplate);
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Email Templates</h2>
            <p className="text-sm text-slate-500">{templates.length} templates &middot; Edit content anytime, changes reflect in all sequences</p>
          </div>
        </div>
        <button onClick={handleCreate}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Plus size={16} /> New Template
        </button>
      </div>

      {/* ── Category Filters ────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            filter === "all"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All ({templates.length})
        </button>
        {Object.entries(CATEGORY_META).map(([key, meta]) => {
          const count = templates.filter((t) => t.category === key).length;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors ${
                filter === key ? meta.color + " ring-current" : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Template Grid ───────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((tpl) => (
          <TemplateCard
            key={tpl.id}
            template={tpl}
            onEdit={() => setEditing(tpl)}
            onPreview={() => setPreviewing(tpl)}
            onDuplicate={() => handleDuplicate(tpl)}
            onDelete={() => handleDelete(tpl.id)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <Mail className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">No templates in this category</p>
          <p className="mt-1 text-xs text-slate-400">Create a new template or switch category filter</p>
        </div>
      )}

      {/* ── Edit Modal ──────────────────────────────────────────── */}
      {editing && (
        <TemplateEditor
          template={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {/* ── Preview Modal ───────────────────────────────────────── */}
      {previewing && (
        <TemplatePreview
          template={previewing}
          onClose={() => setPreviewing(null)}
        />
      )}

      {/* ── Toast ───────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${
          toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
        }`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Template Card
// ═══════════════════════════════════════════════════════════════
function TemplateCard({
  template,
  onEdit,
  onPreview,
  onDuplicate,
  onDelete,
}: {
  template: EmailTemplate;
  onEdit: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const catMeta = CATEGORY_META[template.category];

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Top row: category + type badge */}
      <div className="mb-3 flex items-center justify-between">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${catMeta.color}`}>
          {catMeta.label}
        </span>
        {template.htmlFile ? (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <Sparkles size={10} /> HTML
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
            <FileText size={10} /> Plain Text
          </span>
        )}
      </div>

      {/* Name */}
      <h3 className="mb-1 text-sm font-semibold text-slate-900 line-clamp-1">{template.name}</h3>

      {/* Subject preview */}
      <p className="mb-2 text-xs text-slate-500 line-clamp-1">
        <span className="font-medium text-slate-400">Subject:</span> {template.subject}
      </p>

      {/* Body preview */}
      <p className="mb-3 text-xs leading-relaxed text-slate-400 line-clamp-3">
        {template.bodyPlain.slice(0, 160)}...
      </p>

      {/* Meta */}
      <div className="mb-3 flex items-center gap-3 text-[10px] text-slate-400">
        <span>Updated {template.updatedAt}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 border-t border-slate-100 pt-3">
        <button onClick={onEdit}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          <Edit3 size={12} /> Edit
        </button>
        <button onClick={onPreview}
          className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">
          <Eye size={12} /> Preview
        </button>
        <button onClick={onDuplicate}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          <Copy size={12} />
        </button>
        <button onClick={onDelete}
          className="ml-auto rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Template Editor Modal
// ═══════════════════════════════════════════════════════════════
function TemplateEditor({
  template,
  onSave,
  onClose,
}: {
  template: EmailTemplate;
  onSave: (t: EmailTemplate) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<EmailTemplate>({ ...template });
  const [showHtml, setShowHtml] = useState(false);
  const [htmlLoaded, setHtmlLoaded] = useState<string | null>(null);

  // Load HTML if template has one
  useEffect(() => {
    if (form.htmlFile) {
      fetch(form.htmlFile)
        .then((r) => r.text())
        .then((html) => setHtmlLoaded(html))
        .catch(() => setHtmlLoaded(null));
    }
  }, [form.htmlFile]);

  const variables = ["{{first_name}}", "{{last_name}}", "{{company_name}}", "{{company}}", "{{title}}", "{{city}}", "{{state}}"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
              <Edit3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Edit Template</h3>
              <p className="text-xs text-slate-500">{form.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Name + Category */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Template Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as EmailTemplate["category"] })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                {Object.entries(CATEGORY_META).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Subject Line *</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="e.g. TBP Auto — Premium Brake Drums for {{company_name}}"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Variables reference */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Available Variables</p>
            <div className="flex flex-wrap gap-1.5">
              {variables.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => navigator.clipboard.writeText(v)}
                  className="rounded-md bg-white px-2 py-1 font-mono text-xs text-blue-600 ring-1 ring-inset ring-slate-200 hover:bg-blue-50 hover:ring-blue-300 transition-colors"
                  title="Click to copy"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Plain text body */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Email Body (Plain Text) *
              <span className="ml-2 font-normal text-slate-400">— Used for Instantly campaigns</span>
            </label>
            <textarea
              value={form.bodyPlain}
              onChange={(e) => setForm({ ...form, bodyPlain: e.target.value })}
              placeholder="Write your email body here. Use {{first_name}}, {{company_name}} for personalization..."
              rows={10}
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 leading-relaxed outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono"
            />
            <p className="mt-1 text-xs text-slate-400">{form.bodyPlain.length} characters</p>
          </div>

          {/* HTML template section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <button
              onClick={() => setShowHtml(!showHtml)}
              className="flex w-full items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <Code size={16} className="text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">HTML Template</span>
                {form.htmlFile ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    <Sparkles size={10} /> Linked
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Not linked</span>
                )}
              </div>
              {showHtml ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>

            {showHtml && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">HTML File Path</label>
                  <input
                    type="text"
                    value={form.htmlFile ?? ""}
                    onChange={(e) => setForm({ ...form, htmlFile: e.target.value || undefined })}
                    placeholder="/email-templates/my-template.html"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 font-mono outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-slate-400">Path to HTML file in /public directory. Used for branded preview & A/B testing.</p>
                </div>

                {htmlLoaded && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">HTML Preview</label>
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <iframe
                        srcDoc={replaceVars(htmlLoaded)}
                        title="HTML Preview"
                        className="h-[300px] w-full border-0"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </div>
                )}

                {!form.htmlFile && (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center">
                    <Code size={20} className="mx-auto text-slate-300" />
                    <p className="mt-2 text-xs text-slate-500">
                      No HTML template linked. This email will use plain text format.
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Place HTML files in <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">public/email-templates/</code> and enter the path above.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <p className="text-xs text-slate-400">
            Last updated: {form.updatedAt}
          </p>
          <div className="flex items-center gap-3">
            <button onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={() => onSave(form)}
              disabled={!form.name || !form.subject}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save size={14} /> Save Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Template Preview Modal
// ═══════════════════════════════════════════════════════════════
function TemplatePreview({
  template,
  onClose,
}: {
  template: EmailTemplate;
  onClose: () => void;
}) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (template.htmlFile) {
      setLoading(true);
      fetch(template.htmlFile)
        .then((r) => r.text())
        .then((html) => { setHtmlContent(replaceVars(html)); setLoading(false); })
        .catch(() => { setHtmlContent(null); setLoading(false); });
    }
  }, [template.htmlFile]);

  const isHtml = !!template.htmlFile && !!htmlContent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
              <Eye className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Preview: {template.name}</h3>
              <p className="text-xs text-slate-500">
                Subject: {replaceVars(template.subject)}
                {isHtml && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    <Sparkles className="h-3 w-3" />HTML
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                onClick={() => setViewMode("desktop")}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "desktop" ? "bg-blue-100 text-blue-700" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Monitor className="inline h-3.5 w-3.5 mr-1" /> Desktop
              </button>
              <button
                onClick={() => setViewMode("mobile")}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "mobile" ? "bg-blue-100 text-blue-700" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Smartphone className="inline h-3.5 w-3.5 mr-1" /> Mobile
              </button>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Preview content */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          )}

          {!loading && isHtml && (
            <div className={`mx-auto transition-all duration-300 ${viewMode === "mobile" ? "max-w-[375px]" : "max-w-[700px]"}`}>
              <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ${viewMode === "mobile" ? "ring-4 ring-slate-900/5" : ""}`}>
                {viewMode === "mobile" && (
                  <div className="flex justify-center bg-slate-900 py-2">
                    <div className="h-5 w-28 rounded-full bg-slate-800" />
                  </div>
                )}
                <iframe
                  srcDoc={htmlContent!}
                  title="Email Preview"
                  className="w-full border-0"
                  style={{ height: viewMode === "mobile" ? "680px" : "800px" }}
                  sandbox="allow-same-origin"
                />
                {viewMode === "mobile" && (
                  <div className="flex justify-center bg-slate-900 py-3">
                    <div className="h-1 w-28 rounded-full bg-slate-600" />
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && !isHtml && (
            <div className={`mx-auto transition-all duration-300 ${viewMode === "mobile" ? "max-w-[375px]" : "max-w-[680px]"}`}>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
                  <FileText size={14} />
                  <span>Plain text email — no HTML template linked</span>
                </div>
                <h2 className="mb-4 text-lg font-semibold text-slate-900">{replaceVars(template.subject)}</h2>
                <div
                  className="prose prose-slate max-w-none text-sm leading-relaxed"
                  style={{ color: "#1e293b" }}
                  dangerouslySetInnerHTML={{
                    __html: replaceVars(template.bodyPlain)
                      .split("\n\n")
                      .map((p) => `<p style="margin:0 0 16px 0">${p.replace(/\n/g, "<br/>")}</p>`)
                      .join(""),
                  }}
                />
              </div>
            </div>
          )}

          {/* Variable reference */}
          <div className={`mx-auto mt-4 rounded-lg border border-slate-200 bg-white p-4 ${viewMode === "mobile" ? "max-w-[375px]" : "max-w-[700px]"}`}>
            <p className="mb-2 text-xs font-semibold text-slate-500">Preview Variables</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PREVIEW_VARS).map(([key, value]) => (
                <span key={key} className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-xs">
                  <code className="font-mono text-blue-600">{key}</code>
                  <span className="text-slate-400">&rarr;</span>
                  <span className="font-medium text-slate-700">{value}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
