import { NextRequest, NextResponse } from "next/server";
import {
  isConfigured,
  listSendLogs,
  createSendLogs,
} from "@/services/airtableCrm";

// ── GET — list send logs (optionally filtered by campaign_id) ──
export async function GET(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ data: [], source: "not_configured" });
  }
  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaign_id") ?? undefined;
    const logs = await listSendLogs(campaignId);
    return NextResponse.json({ data: logs, source: "airtable" });
  } catch (err) {
    console.error("SendLogs GET error:", err);
    return NextResponse.json({ error: "Failed to read send logs", data: [] }, { status: 500 });
  }
}

// ── POST — create send log entries (batch) ─────────────────────
export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Airtable not configured" }, { status: 500 });
  }
  try {
    const body = await req.json();
    const logs = body.logs;

    if (!Array.isArray(logs) || logs.length === 0) {
      return NextResponse.json({ error: "Missing or empty logs array" }, { status: 400 });
    }

    const created = await createSendLogs(
      logs.map((log: Record<string, unknown>) => ({
        contact_email: (log.contact_email as string) ?? "",
        contact_name: (log.contact_name as string) ?? "",
        contact_company: (log.contact_company as string) ?? "",
        campaign_id: (log.campaign_id as string) ?? "",
        campaign_name: (log.campaign_name as string) ?? "",
        sequence_step: (log.sequence_step as number) ?? 1,
        subject: (log.subject as string) ?? "",
        body_preview: (log.body_preview as string) ?? "",
        status: (log.status as string) ?? "queued",
        sent_at: (log.sent_at as string) ?? new Date().toISOString(),
        opened_at: null,
        replied_at: null,
        instantly_lead_id: (log.instantly_lead_id as string) ?? "",
      }))
    );

    return NextResponse.json({ data: created, count: created.length, status: "created" });
  } catch (err) {
    console.error("SendLogs POST error:", err);
    return NextResponse.json({ error: "Failed to create send logs" }, { status: 500 });
  }
}
