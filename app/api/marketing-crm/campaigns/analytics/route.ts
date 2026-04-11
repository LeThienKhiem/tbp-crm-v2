import { NextRequest, NextResponse } from "next/server";
import * as instantly from "@/services/instantlyService";

// GET /api/marketing-crm/campaigns/analytics?id=xxx or ?ids=a,b,c
export async function GET(req: NextRequest) {
  if (!instantly.isConfigured()) {
    return NextResponse.json({ error: "INSTANTLY_API_KEY not set" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? undefined;
  const ids = searchParams.get("ids")?.split(",").filter(Boolean) ?? undefined;
  const startDate = searchParams.get("start_date") ?? undefined;
  const endDate = searchParams.get("end_date") ?? undefined;
  const overview = searchParams.get("overview") === "true";

  try {
    if (overview) {
      const data = await instantly.getCampaignAnalyticsOverview(ids, startDate, endDate);
      return NextResponse.json({ data, source: "instantly" });
    }
    const data = await instantly.getCampaignAnalytics(id, ids, startDate, endDate);
    return NextResponse.json({ data, source: "instantly" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
