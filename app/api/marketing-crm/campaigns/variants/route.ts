import { NextRequest, NextResponse } from "next/server";
import { listSendLogs } from "@/services/airtableCrm";

// ── Types ────────────────────────────────────────────────────────
interface VariantStats {
  label: string;
  sent: number;
  opens: number;
  clicks: number;
  replies: number;
  bounces: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
  bounce_rate: number;
  is_winner?: boolean;
}

// ── Demo / fallback data ─────────────────────────────────────────
function getDemoVariants(): VariantStats[] {
  const variants: VariantStats[] = [
    {
      label: "A",
      sent: 1245,
      opens: 498,
      clicks: 87,
      replies: 62,
      bounces: 31,
      open_rate: 0,
      click_rate: 0,
      reply_rate: 0,
      bounce_rate: 0,
    },
    {
      label: "B",
      sent: 1230,
      opens: 578,
      clicks: 104,
      replies: 79,
      bounces: 28,
      open_rate: 0,
      click_rate: 0,
      reply_rate: 0,
      bounce_rate: 0,
    },
    {
      label: "C",
      sent: 1218,
      opens: 432,
      clicks: 63,
      replies: 41,
      bounces: 35,
      open_rate: 0,
      click_rate: 0,
      reply_rate: 0,
      bounce_rate: 0,
    },
  ];

  return computeRatesAndWinner(variants);
}

function computeRatesAndWinner(variants: VariantStats[]): VariantStats[] {
  // Compute rates
  for (const v of variants) {
    const s = v.sent || 1;
    v.open_rate = parseFloat(((v.opens / s) * 100).toFixed(1));
    v.click_rate = parseFloat(((v.clicks / s) * 100).toFixed(1));
    v.reply_rate = parseFloat(((v.replies / s) * 100).toFixed(1));
    v.bounce_rate = parseFloat(((v.bounces / s) * 100).toFixed(1));
  }

  // Mark winner (highest reply_rate)
  if (variants.length > 1) {
    let maxIdx = 0;
    for (let i = 1; i < variants.length; i++) {
      if (variants[i].reply_rate > variants[maxIdx].reply_rate) {
        maxIdx = i;
      }
    }
    // Only mark winner if there's a meaningful difference
    if (variants[maxIdx].reply_rate > 0) {
      variants[maxIdx].is_winner = true;
    }
  }

  return variants;
}

// ── GET handler ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const campaignId = req.nextUrl.searchParams.get("campaign_id") ?? undefined;

    let logs;
    try {
      logs = await listSendLogs(campaignId);
    } catch {
      // If Airtable isn't configured or fails, return demo data
      return NextResponse.json({
        data: {
          campaign_id: campaignId,
          variants: getDemoVariants(),
          is_demo: true,
        },
      });
    }

    // Check if logs have a variant_label field
    // The SendLogRow type doesn't include variant_label, so we access raw fields
    // For now, if no logs or no variant labels, return demo data
    if (!logs || logs.length === 0) {
      return NextResponse.json({
        data: {
          campaign_id: campaignId,
          variants: getDemoVariants(),
          is_demo: true,
        },
      });
    }

    // Try to group by variant_label from the subject line pattern or step
    // Since SendLogRow doesn't have variant_label, we attempt heuristic grouping
    // by looking at subject variations for same sequence_step
    const stepSubjects = new Map<number, Map<string, { label: string; logs: typeof logs }>>();

    for (const log of logs) {
      const step = log.sequence_step;
      if (!stepSubjects.has(step)) {
        stepSubjects.set(step, new Map());
      }
      const subjectMap = stepSubjects.get(step)!;
      const subjectKey = log.subject.trim();
      if (!subjectMap.has(subjectKey)) {
        const variantIndex = subjectMap.size;
        const label = String.fromCharCode(65 + variantIndex); // A, B, C...
        subjectMap.set(subjectKey, { label, logs: [] });
      }
      subjectMap.get(subjectKey)!.logs.push(log);
    }

    // Aggregate across all steps — group by variant label
    const variantMap = new Map<string, { sent: number; opens: number; clicks: number; replies: number; bounces: number }>();

    for (const [, subjects] of stepSubjects) {
      if (subjects.size <= 1) continue; // No A/B test for this step
      for (const [, { label, logs: varLogs }] of subjects) {
        if (!variantMap.has(label)) {
          variantMap.set(label, { sent: 0, opens: 0, clicks: 0, replies: 0, bounces: 0 });
        }
        const agg = variantMap.get(label)!;
        for (const l of varLogs) {
          agg.sent++;
          if (l.opened_at) agg.opens++;
          if (l.replied_at) agg.replies++;
          if (l.status === "bounced") agg.bounces++;
          // clicks not tracked in SendLogRow, keep 0
        }
      }
    }

    // If no multi-variant steps found, return demo data
    if (variantMap.size <= 1) {
      return NextResponse.json({
        data: {
          campaign_id: campaignId,
          variants: getDemoVariants(),
          is_demo: true,
        },
      });
    }

    const variants: VariantStats[] = [];
    for (const [label, agg] of variantMap) {
      variants.push({
        label,
        sent: agg.sent,
        opens: agg.opens,
        clicks: agg.clicks,
        replies: agg.replies,
        bounces: agg.bounces,
        open_rate: 0,
        click_rate: 0,
        reply_rate: 0,
        bounce_rate: 0,
      });
    }

    variants.sort((a, b) => a.label.localeCompare(b.label));

    return NextResponse.json({
      data: {
        campaign_id: campaignId,
        variants: computeRatesAndWinner(variants),
        is_demo: false,
      },
    });
  } catch (error) {
    console.error("Variant analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch variant analytics" },
      { status: 500 }
    );
  }
}
