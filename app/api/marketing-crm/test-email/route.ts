import { NextRequest, NextResponse } from "next/server";
import * as instantly from "@/services/instantlyService";

// Sample data for variable replacement
const SAMPLE_VARIABLES: Record<string, string> = {
  first_name: "John",
  last_name: "Smith",
  company: "Acme Auto Parts",
  company_name: "Acme Auto Parts",
  title: "VP of Purchasing",
  city: "Houston",
  state: "Texas",
};

/** Replace {{variable}} placeholders with sample data */
function replaceVariables(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return SAMPLE_VARIABLES[key.toLowerCase()] ?? `{{${key}}}`;
  });
}

/** Resolve spintax {A|B|C} to a random option */
function resolveSpintax(text: string): string {
  // Protect {{variables}} first
  const vars: string[] = [];
  const protected_ = text.replace(/\{\{([^}]+)\}\}/g, (_m, v: string) => {
    vars.push(v);
    return `__VAR_${vars.length - 1}__`;
  });
  // Resolve spintax
  const resolved = protected_.replace(/\{([^{}]+)\}/g, (_match, group: string) => {
    const options = group.split("|");
    if (options.length <= 1) return `{${group}}`;
    return options[Math.floor(Math.random() * options.length)];
  });
  // Restore variables
  return resolved.replace(/__VAR_(\d+)__/g, (_m, idx: string) => `{{${vars[parseInt(idx)]}}}`);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to_email, subject, body: emailBody, from_name } = body as {
      to_email: string;
      subject: string;
      body: string;
      from_name?: string;
    };

    if (!to_email || !subject || !emailBody) {
      return NextResponse.json(
        { status: "error", message: "Missing required fields: to_email, subject, body" },
        { status: 400 }
      );
    }

    // Resolve spintax first, then replace variables
    const resolvedSubject = replaceVariables(resolveSpintax(subject));
    const resolvedBody = replaceVariables(resolveSpintax(emailBody));

    // Try sending via Instantly if configured
    if (instantly.isConfigured()) {
      try {
        await instantly.sendTestEmail({
          to_email,
          subject: resolvedSubject,
          body: resolvedBody,
          from_name: from_name || "TBP Auto",
        });

        return NextResponse.json({
          status: "sent" as const,
          message: `Test email sent to ${to_email}`,
          preview: { subject: resolvedSubject, body: resolvedBody },
        });
      } catch (err) {
        // If Instantly send fails, fall back to preview
        console.error("Instantly send failed, returning preview:", err);
        return NextResponse.json({
          status: "preview_only" as const,
          message: `Could not send via Instantly (${err instanceof Error ? err.message : "unknown error"}). Showing preview instead.`,
          preview: { subject: resolvedSubject, body: resolvedBody },
        });
      }
    }

    // Instantly not configured — return preview
    return NextResponse.json({
      status: "preview_only" as const,
      message: "Instantly not configured. Showing rendered preview with sample data.",
      preview: { subject: resolvedSubject, body: resolvedBody },
    });
  } catch (err) {
    console.error("Test email error:", err);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 }
    );
  }
}
