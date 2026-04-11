"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Eye,
  Mail,
  Clock,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Monitor,
  FileText,
  Sparkles,
} from "lucide-react";

interface EmailStep {
  id?: string;
  order?: number;
  type: string;
  subject?: string;
  body?: string;
  templateFile?: string;
  wait_days?: number;
  condition?: string;
}

interface EmailPreviewProps {
  steps: EmailStep[];
  sequenceName?: string;
  fromEmail?: string;
  onClose: () => void;
}

// ── Sample data for preview variables ─────────────────────────
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

// ── Main EmailPreview Component ───────────────────────────────
export default function EmailPreview({ steps, sequenceName, fromEmail, onClose }: EmailPreviewProps) {
  const emailSteps = steps.filter((s) => s.type === "email" && s.subject);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loadingHtml, setLoadingHtml] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const step = emailSteps[currentIndex];

  // Fetch HTML template when step changes
  useEffect(() => {
    if (!step) return;

    if (step.templateFile) {
      setLoadingHtml(true);
      fetch(step.templateFile)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch template");
          return res.text();
        })
        .then((html) => {
          setHtmlContent(replaceVars(html));
          setLoadingHtml(false);
        })
        .catch(() => {
          setHtmlContent(null);
          setLoadingHtml(false);
        });
    } else {
      setHtmlContent(null);
    }
  }, [step]);

  if (emailSteps.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
          <Mail className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">No email steps to preview</p>
          <p className="mt-1 text-sm text-slate-500">Add email steps with subject and body first.</p>
          <button onClick={onClose} className="mt-4 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
            Close
          </button>
        </div>
      </div>
    );
  }

  const subject = replaceVars(step.subject ?? "");

  // Calculate wait days before this email
  const originalIndex = steps.indexOf(step);
  const prevSteps = steps.slice(0, originalIndex);
  const lastWait = [...prevSteps].reverse().find((s) => s.type === "wait");
  const waitDays = lastWait?.wait_days;

  // Build timeline summary
  const timeline = steps.map((s, i) => ({
    type: s.type,
    label:
      s.type === "email"
        ? `Email ${emailSteps.indexOf(s) + 1}: ${replaceVars(s.subject ?? "(No subject)").slice(0, 40)}${(s.subject ?? "").length > 40 ? "..." : ""}`
        : s.type === "wait"
          ? `Wait ${s.wait_days} day${(s.wait_days ?? 0) > 1 ? "s" : ""}`
          : `Condition: ${s.condition ?? "unknown"}`,
    active: s === step,
    index: i,
    hasTemplate: s.type === "email" && !!s.templateFile,
  }));

  const isHtmlTemplate = !!step.templateFile && !!htmlContent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
              <Eye className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Email Preview</h3>
              <p className="text-xs text-slate-500">
                {sequenceName ?? "Sequence"} &middot; Step {currentIndex + 1} of {emailSteps.length}
                {isHtmlTemplate && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    <Sparkles className="h-3 w-3" />HTML Template
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                onClick={() => setViewMode("desktop")}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "desktop" ? "bg-blue-100 text-blue-700" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Monitor className="inline h-3.5 w-3.5 mr-1" />
                Desktop
              </button>
              <button
                onClick={() => setViewMode("mobile")}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "mobile" ? "bg-blue-100 text-blue-700" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Smartphone className="inline h-3.5 w-3.5 mr-1" />
                Mobile
              </button>
            </div>

            {/* Nav arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentIndex(Math.min(emailSteps.length - 1, currentIndex + 1))}
                disabled={currentIndex === emailSteps.length - 1}
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Body: Timeline + Email ──────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar — Sequence Timeline */}
          <div className="hidden w-64 shrink-0 border-r border-slate-200 bg-slate-50/50 p-4 lg:block overflow-y-auto">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Sequence Flow</p>
            <div className="space-y-1">
              {timeline.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (item.type === "email") {
                      setCurrentIndex(emailSteps.indexOf(steps[item.index] as EmailStep));
                    }
                  }}
                  className={`flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                    item.active
                      ? "bg-blue-50 text-blue-800 ring-1 ring-blue-200"
                      : item.type === "email"
                        ? "text-slate-700 hover:bg-slate-100"
                        : "text-slate-400"
                  }`}
                >
                  {item.type === "email" && <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                  {item.type === "wait" && <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                  {item.type === "condition" && <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <span className="line-clamp-2">{item.label}</span>
                    {item.hasTemplate && (
                      <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-emerald-600">
                        <Sparkles className="h-2.5 w-2.5" />HTML
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-6 border-t border-slate-200 pt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Legend</p>
              <div className="space-y-1.5 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">
                    <Sparkles className="h-2.5 w-2.5" />HTML
                  </span>
                  <span>Branded template</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-3 w-3 text-slate-400" />
                  <span>Plain text email</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Preview Area */}
          <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
            {/* Wait indicator */}
            {waitDays && (
              <div className="mb-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                <span>Sent {waitDays} day{waitDays > 1 ? "s" : ""} after previous email</span>
              </div>
            )}

            {/* Subject line bar */}
            <div className={`mx-auto mb-3 ${viewMode === "mobile" ? "max-w-[375px]" : "max-w-[700px]"}`}>
              <div className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2.5 shadow-sm">
                <span className="text-xs font-medium text-slate-400 shrink-0">Subject:</span>
                <span className="text-sm font-semibold text-slate-900 truncate">{subject || "(No subject)"}</span>
                <span className="ml-auto text-[10px] text-slate-400 shrink-0">
                  From: {fromEmail ?? "thomas@outreach.tbpauto.com"}
                </span>
              </div>
            </div>

            {/* Loading state */}
            {loadingHtml && (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              </div>
            )}

            {/* ── HTML Template Preview (iframe) ──────────────── */}
            {!loadingHtml && isHtmlTemplate && (
              <div className={`mx-auto transition-all duration-300 ${viewMode === "mobile" ? "max-w-[375px]" : "max-w-[700px]"}`}>
                <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ${viewMode === "mobile" ? "ring-4 ring-slate-900/5" : ""}`}>
                  {/* Mobile notch */}
                  {viewMode === "mobile" && (
                    <div className="flex justify-center bg-slate-900 py-2">
                      <div className="h-5 w-28 rounded-full bg-slate-800" />
                    </div>
                  )}
                  <iframe
                    ref={iframeRef}
                    srcDoc={htmlContent!}
                    title="Email Preview"
                    className="w-full border-0"
                    style={{
                      height: viewMode === "mobile" ? "680px" : "800px",
                      pointerEvents: "auto",
                    }}
                    sandbox="allow-same-origin"
                  />
                  {/* Mobile home bar */}
                  {viewMode === "mobile" && (
                    <div className="flex justify-center bg-slate-900 py-3">
                      <div className="h-1 w-28 rounded-full bg-slate-600" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Plain Text Fallback Preview ─────────────────── */}
            {!loadingHtml && !isHtmlTemplate && (
              <div className={`mx-auto transition-all duration-300 ${viewMode === "mobile" ? "max-w-[375px]" : "max-w-[680px]"}`}>
                {/* Info banner: no HTML template */}
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span>Plain text preview — select an HTML template in the editor for a branded design.</span>
                </div>

                <PlainTextPreview
                  step={step}
                  subject={subject}
                  fromEmail={fromEmail ?? "thomas@outreach.tbpauto.com"}
                  viewMode={viewMode}
                />
              </div>
            )}

            {/* Variable reference */}
            <div className={`mx-auto mt-4 rounded-lg border border-slate-200 bg-white p-4 ${viewMode === "mobile" ? "max-w-[375px]" : "max-w-[700px]"}`}>
              <p className="mb-2 text-xs font-semibold text-slate-500">Preview Variables Used</p>
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
    </div>
  );
}

// ── Plain Text Preview (fallback when no HTML template) ─────────
function PlainTextPreview({
  step,
  subject,
  fromEmail,
  viewMode,
}: {
  step: EmailStep;
  subject: string;
  fromEmail: string;
  viewMode: "desktop" | "mobile";
}) {
  const bodyHtml = (replaceVars(step.body ?? ""))
    .split("\n\n")
    .map((para) => `<p style="margin:0 0 16px 0;line-height:1.6">${para.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  return (
    <>
      {/* Gmail-style email header */}
      <div className="rounded-t-xl border border-b-0 border-slate-200 bg-white px-6 py-4">
        <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="ml-auto text-[10px] text-slate-400">Plain Text Preview</span>
        </div>
        <h2 className={`font-semibold text-slate-900 ${viewMode === "mobile" ? "text-base" : "text-lg"}`}>
          {subject || "(No subject)"}
        </h2>
        <div className="mt-3 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            TN
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900">Thomas Nguyen</span>
              <span className="text-xs text-slate-400">&lt;{fromEmail}&gt;</span>
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              to David Thompson &lt;david.thompson@nationalfleet.com&gt;
            </div>
          </div>
          <span className="shrink-0 text-xs text-slate-400">
            {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
      </div>

      {/* Email body */}
      <div className="rounded-b-xl border border-slate-200 bg-white px-6 py-6">
        <div
          className={`prose prose-slate max-w-none ${viewMode === "mobile" ? "prose-sm" : "prose-base"}`}
          style={{ color: "#1e293b", fontSize: viewMode === "mobile" ? "14px" : "15px", lineHeight: "1.7" }}
          dangerouslySetInnerHTML={{ __html: bodyHtml || "<p style='color:#94a3b8'>(No email body)</p>" }}
        />
        <div className="mt-6 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
              <span className="text-xs font-bold text-white">TBP</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Thomas Nguyen</p>
              <p className="text-xs text-slate-500">Sales Director, TBP Auto</p>
              <p className="text-xs text-slate-400">outreach.tbpauto.com</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Compact Preview Button (reusable) ─────────────────────────
export function PreviewButton({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:shadow-md transition-all"
    >
      <Eye className="h-4 w-4 text-blue-600" />
      {label ?? "Preview Email"}
    </button>
  );
}
