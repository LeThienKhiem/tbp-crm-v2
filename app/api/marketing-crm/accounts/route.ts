import { NextResponse } from "next/server";
import * as instantly from "@/services/instantlyService";

// GET /api/marketing-crm/accounts — list sending accounts from Instantly
export async function GET() {
  if (!instantly.isConfigured()) {
    return NextResponse.json({ data: [], source: "not_configured", error: "INSTANTLY_API_KEY not set" });
  }

  try {
    const accounts = await instantly.listAccounts();
    const data = accounts.map((a) => ({
      email: a.email,
      status: a.status,
      status_label: instantly.accountStatusLabel(a.status),
      first_name: a.first_name,
      last_name: a.last_name,
      daily_limit: a.daily_limit,
      sending_gap: a.sending_gap,
      warmup_status: a.warmup_status,
      warmup: a.warmup,
      provider_code: a.provider_code,
      created_at: a.timestamp_created,
    }));
    return NextResponse.json({ data, source: "instantly" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ data: [], source: "error", error: message }, { status: 500 });
  }
}
