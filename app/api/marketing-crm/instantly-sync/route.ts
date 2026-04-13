import { NextResponse } from "next/server";
import * as instantly from "@/services/instantlyService";
import * as airtableCrm from "@/services/airtableCrm";
import * as airtableService from "@/services/airtableService";

// ── In-memory last sync status ──────────────────────────────────
interface SyncResult {
  synced_at: string;
  campaigns: { created: number; updated: number; total: number };
  contacts: { created: number; skipped: number; total: number };
  send_logs: { created: number; total: number };
  errors: string[];
}

let lastSyncResult: SyncResult | null = null;

// ── GET — return last sync status ───────────────────────────────
export async function GET() {
  if (lastSyncResult) {
    return NextResponse.json({ data: lastSyncResult });
  }

  // Fallback: try to infer from most recent campaign updated_at
  try {
    const campaigns = await airtableCrm.listCampaigns();
    const latest = campaigns.reduce<string | null>((acc, c) => {
      const dt = c.deployed_at;
      if (dt && (!acc || dt > acc)) return dt;
      return acc;
    }, null);

    return NextResponse.json({
      data: {
        synced_at: latest ?? "never",
        campaigns: { created: 0, updated: 0, total: campaigns.length },
        contacts: { created: 0, skipped: 0, total: 0 },
        send_logs: { created: 0, total: 0 },
        errors: [],
      },
    });
  } catch {
    return NextResponse.json({
      data: {
        synced_at: "never",
        campaigns: { created: 0, updated: 0, total: 0 },
        contacts: { created: 0, skipped: 0, total: 0 },
        send_logs: { created: 0, total: 0 },
        errors: [],
      },
    });
  }
}

// ── POST — full sync from Instantly to Airtable ────────────────
export async function POST() {
  // Check Instantly is configured
  if (!instantly.isConfigured()) {
    return NextResponse.json(
      {
        error: "Instantly API is not configured. Set the INSTANTLY_API_KEY environment variable.",
        hint: "Add INSTANTLY_API_KEY to your .env.local file. Get it from https://app.instantly.ai/settings/api",
      },
      { status: 503 }
    );
  }

  const errors: string[] = [];
  const stats = {
    campaigns: { created: 0, updated: 0, total: 0 },
    contacts: { created: 0, skipped: 0, total: 0 },
    send_logs: { created: 0, total: 0 },
  };

  const startTime = Date.now();
  const TIMEOUT_MS = 60_000;

  function isTimedOut(): boolean {
    return Date.now() - startTime > TIMEOUT_MS;
  }

  try {
    // 1. Fetch all campaigns from Instantly
    const instantlyCampaigns = await instantly.listCampaigns();
    stats.campaigns.total = instantlyCampaigns.length;

    // Fetch existing Airtable campaigns to check for duplicates
    let existingCampaigns: airtableCrm.CampaignRow[] = [];
    try {
      existingCampaigns = await airtableCrm.listCampaigns();
    } catch (err) {
      errors.push(`Failed to fetch existing campaigns: ${err instanceof Error ? err.message : String(err)}`);
    }

    const existingByInstantlyId = new Map<string, airtableCrm.CampaignRow>();
    for (const c of existingCampaigns) {
      if (c.instantly_campaign_id) {
        existingByInstantlyId.set(c.instantly_campaign_id, c);
      }
    }

    // 2. Process each campaign
    const campaignResults = await Promise.allSettled(
      instantlyCampaigns.map(async (camp) => {
        if (isTimedOut()) {
          throw new Error("Sync timeout — returning partial results");
        }

        // 2a. Get analytics for this campaign
        let analytics: instantly.CampaignAnalytics | null = null;
        try {
          const analyticsArr = await instantly.getCampaignAnalytics(camp.id);
          analytics = analyticsArr?.[0] ?? null;
        } catch (err) {
          errors.push(`Analytics fetch failed for "${camp.name}": ${err instanceof Error ? err.message : String(err)}`);
        }

        // 2b. Upsert campaign to Airtable
        const existing = existingByInstantlyId.get(camp.id);
        const statusMap: Record<number, string> = {
          0: "draft",
          1: "active",
          2: "paused",
          3: "completed",
          [-1]: "active",
          [-2]: "paused",
        };

        const campaignData = {
          name: camp.name,
          sequence_id: "",
          sequence_name: "",
          instantly_campaign_id: camp.id,
          status: statusMap[camp.status] ?? "active",
          total_leads: analytics?.leads_count ?? 0,
          emails_sent: analytics?.emails_sent_count ?? 0,
          opens: analytics?.open_count ?? 0,
          replies: analytics?.reply_count ?? 0,
          bounces: analytics?.bounced_count ?? 0,
          deployed_by: "instantly_sync",
          deployed_at: camp.timestamp_created ?? camp.created_at ?? new Date().toISOString(),
          settings: null,
        };

        try {
          if (existing?._recordId) {
            await airtableCrm.updateCampaignStats(existing._recordId, {
              status: campaignData.status,
              total_leads: campaignData.total_leads,
              emails_sent: campaignData.emails_sent,
              opens: campaignData.opens,
              replies: campaignData.replies,
              bounces: campaignData.bounces,
            });
            stats.campaigns.updated++;
          } else {
            await airtableCrm.createCampaign(campaignData);
            stats.campaigns.created++;
          }
        } catch (err) {
          errors.push(`Campaign upsert failed for "${camp.name}": ${err instanceof Error ? err.message : String(err)}`);
        }

        // 2c. Fetch leads in campaign
        if (!isTimedOut()) {
          try {
            const leads = await instantly.listLeads(camp.id, 1000);
            stats.contacts.total += leads.length;

            // Check each lead for existing contact
            const leadResults = await Promise.allSettled(
              leads.map(async (lead) => {
                if (isTimedOut()) return;

                try {
                  const existingContact = await airtableService.findByEmail(lead.email);
                  if (existingContact) {
                    stats.contacts.skipped++;
                    return;
                  }

                  await airtableService.createContacts([
                    {
                      first_name: lead.first_name ?? "",
                      last_name: lead.last_name ?? "",
                      email: lead.email,
                      phone: lead.phone ?? "",
                      company: lead.company_name ?? "",
                      title: lead.job_title ?? "",
                      source: "instantly",
                      status: "new",
                      tags: `instantly,${camp.name}`,
                      created_at: lead.timestamp_created ?? new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    },
                  ]);
                  stats.contacts.created++;
                } catch (err) {
                  errors.push(`Contact sync failed for "${lead.email}": ${err instanceof Error ? err.message : String(err)}`);
                }
              })
            );

            // Count any rejected promises as errors
            for (const r of leadResults) {
              if (r.status === "rejected") {
                errors.push(`Lead processing error: ${r.reason}`);
              }
            }
          } catch (err) {
            errors.push(`Lead fetch failed for "${camp.name}": ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        // 2d. Fetch emails (send logs)
        if (!isTimedOut()) {
          try {
            const [sentEmails, receivedEmails] = await Promise.allSettled([
              instantly.listEmails(camp.id, 500, "sent"),
              instantly.listEmails(camp.id, 500, "received"),
            ]);

            const allEmails: instantly.InstantlyEmail[] = [];
            if (sentEmails.status === "fulfilled") allEmails.push(...sentEmails.value);
            if (receivedEmails.status === "fulfilled") allEmails.push(...receivedEmails.value);
            if (sentEmails.status === "rejected") {
              errors.push(`Sent emails fetch failed for "${camp.name}": ${sentEmails.reason}`);
            }
            if (receivedEmails.status === "rejected") {
              errors.push(`Received emails fetch failed for "${camp.name}": ${receivedEmails.reason}`);
            }

            if (allEmails.length > 0) {
              const sendLogs = allEmails.map((email) => ({
                contact_email: email.to_address_email,
                contact_name: "",
                contact_company: "",
                campaign_id: camp.id,
                campaign_name: camp.name,
                sequence_step: 1,
                subject: email.subject ?? "",
                body_preview: email.body?.text?.slice(0, 500) ?? email.body?.html?.slice(0, 500) ?? "",
                status: email.email_type === "received" ? "replied" : "sent",
                sent_at: email.timestamp_created,
                opened_at: null,
                replied_at: email.email_type === "received" ? email.timestamp_created : null,
                instantly_lead_id: email.lead_id ?? "",
              }));

              try {
                const created = await airtableCrm.createSendLogs(sendLogs);
                stats.send_logs.created += created.length;
                stats.send_logs.total += created.length;
              } catch (err) {
                errors.push(`Send logs create failed for "${camp.name}": ${err instanceof Error ? err.message : String(err)}`);
              }
            }
          } catch (err) {
            errors.push(`Email fetch failed for "${camp.name}": ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      })
    );

    // Collect any top-level campaign processing failures
    for (const r of campaignResults) {
      if (r.status === "rejected") {
        errors.push(`Campaign processing error: ${r.reason}`);
      }
    }
  } catch (err) {
    errors.push(`Sync failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const result: SyncResult = {
    synced_at: new Date().toISOString(),
    campaigns: stats.campaigns,
    contacts: stats.contacts,
    send_logs: stats.send_logs,
    errors,
  };

  lastSyncResult = result;

  const timedOut = Date.now() - startTime > TIMEOUT_MS;
  if (timedOut) {
    result.errors.unshift("Sync timed out after 60s — partial results returned");
  }

  return NextResponse.json({ data: result });
}
