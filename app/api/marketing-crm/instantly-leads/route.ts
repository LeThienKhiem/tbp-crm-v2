import { NextRequest, NextResponse } from "next/server";
import * as instantly from "@/services/instantlyService";

// POST /api/marketing-crm/instantly-leads — push contacts to an Instantly campaign
export async function POST(req: NextRequest) {
  if (!instantly.isConfigured()) {
    return NextResponse.json({ error: "INSTANTLY_API_KEY not set" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { campaign_id, leads } = body;

    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
    }
    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: "leads array is required" }, { status: 400 });
    }

    // Instantly allows max 1000 per batch
    const result = await instantly.addLeadsBulk(campaign_id, leads);
    return NextResponse.json({ data: result, source: "instantly" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/marketing-crm/instantly-leads?campaign_id=xxx — list leads in a campaign
export async function GET(req: NextRequest) {
  if (!instantly.isConfigured()) {
    return NextResponse.json({ data: [], source: "not_configured" });
  }

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaign_id") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  try {
    const leads = await instantly.listLeads(campaignId, 100, search);
    return NextResponse.json({ data: leads, source: "instantly" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ data: [], source: "error", error: message }, { status: 500 });
  }
}
