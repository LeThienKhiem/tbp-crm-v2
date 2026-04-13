import { NextRequest, NextResponse } from "next/server";
import * as instantly from "@/services/instantlyService";

export async function GET(req: NextRequest) {
  try {
    if (!instantly.isConfigured()) {
      return NextResponse.json({
        data: [],
        unread_count: 0,
        message: "Instantly not configured",
      });
    }

    const { searchParams } = req.nextUrl;
    const campaign_id = searchParams.get("campaign_id") ?? undefined;
    const email_type =
      (searchParams.get("email_type") as "received" | "sent" | "manual") ??
      "received";
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);

    const [emails, unread_count] = await Promise.all([
      instantly.listEmails(campaign_id, limit, email_type),
      instantly.getUnreadCount(),
    ]);

    return NextResponse.json({ data: emails, unread_count });
  } catch (err) {
    console.error("[inbox] GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
