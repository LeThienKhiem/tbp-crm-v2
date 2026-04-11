import { NextRequest, NextResponse } from "next/server";
import * as instantly from "@/services/instantlyService";

// ── GET — list all campaigns (Instantly + analytics merged) ──
export async function GET() {
  if (!instantly.isConfigured()) {
    return NextResponse.json({ data: [], source: "not_configured", error: "INSTANTLY_API_KEY not set" });
  }

  try {
    const campaigns = await instantly.listCampaigns();
    // Fetch analytics for all campaigns in one call
    const ids = campaigns.map((c) => c.id);
    let analyticsMap: Record<string, instantly.CampaignAnalytics> = {};
    if (ids.length) {
      try {
        const analytics = await instantly.getCampaignAnalytics(undefined, ids);
        for (const a of analytics) {
          analyticsMap[a.campaign_id] = a;
        }
      } catch {
        // Analytics may fail if no data yet — continue without
      }
    }

    const data = campaigns.map((c) => {
      const a = analyticsMap[c.id];
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        status_label: instantly.campaignStatusLabel(c.status),
        daily_limit: c.daily_limit,
        email_list: c.email_list || [],
        schedule: c.campaign_schedule,
        sequences: c.sequences || [],
        stop_on_reply: c.stop_on_reply,
        link_tracking: c.link_tracking,
        open_tracking: c.open_tracking,
        text_only: c.text_only,
        created_at: c.timestamp_created || c.created_at,
        updated_at: c.timestamp_updated || c.updated_at,
        // Analytics
        leads_count: a?.leads_count ?? 0,
        contacted_count: a?.contacted_count ?? 0,
        emails_sent: a?.emails_sent_count ?? 0,
        opens: a?.open_count_unique ?? 0,
        replies: a?.reply_count_unique ?? 0,
        clicks: a?.link_click_count_unique ?? 0,
        bounces: a?.bounced_count ?? 0,
        unsubscribes: a?.unsubscribed_count ?? 0,
        completed: a?.completed_count ?? 0,
        opportunities: a?.total_opportunities ?? 0,
        opportunity_value: a?.total_opportunity_value ?? 0,
      };
    });

    return NextResponse.json({ data, source: "instantly" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ data: [], source: "error", error: message }, { status: 500 });
  }
}

// ── POST — create a new campaign in Instantly ────────────────
export async function POST(req: NextRequest) {
  if (!instantly.isConfigured()) {
    return NextResponse.json({ error: "INSTANTLY_API_KEY not set" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { name, sequences, email_list, daily_limit, schedule, stop_on_reply, link_tracking, open_tracking, text_only, email_gap } = body;

    if (!name) {
      return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
    }

    // Default schedule: Mon-Fri 9am-5pm CST
    const campaign_schedule = schedule || {
      start_date: null,
      end_date: null,
      schedules: [
        {
          name: "Business hours",
          timing: { from: "09:00", to: "17:00" },
          days: { "0": false, "1": true, "2": true, "3": true, "4": true, "5": true, "6": false },
          timezone: "America/Chicago",
        },
      ],
    };

    const campaign = await instantly.createCampaign({
      name,
      sequences: sequences || [],
      email_list: email_list || [],
      daily_limit: daily_limit || 50,
      stop_on_reply: stop_on_reply ?? true,
      link_tracking: link_tracking ?? false,
      open_tracking: open_tracking ?? true,
      text_only: text_only ?? false,
      email_gap: email_gap ?? 5,
      campaign_schedule,
    });

    return NextResponse.json({ data: campaign, source: "instantly" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
