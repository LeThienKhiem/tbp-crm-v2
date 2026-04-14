import { NextRequest, NextResponse } from "next/server";
import * as instantly from "@/services/instantlyService";
import * as airtableService from "@/services/airtableService";

/**
 * POST /api/marketing-crm/contacts/push-to-instantly
 *
 * Push contacts to an Instantly campaign.
 * Accepts either a list of contact IDs or a group name (resolves members by tag).
 *
 * Body:
 *   campaign_id: string          — Instantly campaign ID
 *   contact_ids?: string[]       — specific contact record IDs
 *   group_name?: string          — push all contacts tagged with this group
 */
export async function POST(req: NextRequest) {
  if (!instantly.isConfigured()) {
    return NextResponse.json(
      { error: "Instantly API is not configured. Set INSTANTLY_API_KEY." },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const { campaign_id, contact_ids, group_name } = body as {
      campaign_id: string;
      contact_ids?: string[];
      group_name?: string;
    };

    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
    }

    if (!contact_ids?.length && !group_name) {
      return NextResponse.json(
        { error: "Provide contact_ids or group_name" },
        { status: 400 },
      );
    }

    // 1. Resolve contacts
    const allContacts = await airtableService.listContacts();

    let targetContacts: typeof allContacts;

    if (group_name) {
      // Find contacts whose tags include the group name
      const gn = group_name.toLowerCase();
      targetContacts = allContacts.filter((c) =>
        (c.tags ?? "")
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .includes(gn),
      );
    } else {
      const idSet = new Set(contact_ids);
      targetContacts = allContacts.filter((c) => idSet.has(c.id));
    }

    // Filter out contacts without email
    const withEmail = targetContacts.filter((c) => c.email);
    if (withEmail.length === 0) {
      return NextResponse.json(
        { error: "No contacts with valid email found", resolved: targetContacts.length },
        { status: 400 },
      );
    }

    // 2. Push to Instantly using bulk API
    const leads = withEmail.map((c) => ({
      email: c.email,
      first_name: c.first_name ?? "",
      last_name: c.last_name ?? "",
      company_name: c.company ?? "",
      job_title: c.title ?? "",
      phone: c.phone ?? "",
    }));

    const result = await instantly.addLeadsBulk(campaign_id, leads);

    return NextResponse.json({
      data: {
        total_contacts: withEmail.length,
        leads_uploaded: result.leads_uploaded,
        duplicated_leads: result.duplicated_leads,
        skipped_count: result.skipped_count,
        invalid_email_count: result.invalid_email_count,
        status: result.status,
      },
      source: group_name ? `group:${group_name}` : "selected_contacts",
    });
  } catch (err) {
    console.error("Push to Instantly error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Push failed" },
      { status: 500 },
    );
  }
}
