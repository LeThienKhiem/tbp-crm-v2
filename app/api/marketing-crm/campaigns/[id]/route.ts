import { NextRequest, NextResponse } from "next/server";
import * as instantly from "@/services/instantlyService";

type Ctx = { params: Promise<{ id: string }> };

// ── GET — single campaign detail ─────────────────────────────
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const campaign = await instantly.getCampaign(id);
    // Also fetch analytics
    let analytics: instantly.CampaignAnalytics | null = null;
    try {
      const arr = await instantly.getCampaignAnalytics(id);
      analytics = arr[0] ?? null;
    } catch { /* ok */ }

    return NextResponse.json({ data: { ...campaign, analytics }, source: "instantly" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── PATCH — update campaign (or pause/activate) ──────────────
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const { action, ...updates } = body;

    if (action === "activate") {
      const result = await instantly.activateCampaign(id);
      return NextResponse.json({ data: result, source: "instantly" });
    }
    if (action === "pause") {
      const result = await instantly.pauseCampaign(id);
      return NextResponse.json({ data: result, source: "instantly" });
    }

    // General update
    const result = await instantly.updateCampaign(id, updates);
    return NextResponse.json({ data: result, source: "instantly" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── DELETE — delete campaign ─────────────────────────────────
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    await instantly.deleteCampaign(id);
    return NextResponse.json({ data: { deleted: true } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
