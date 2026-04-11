import { NextRequest, NextResponse } from "next/server";
import { createContacts, findByEmail, type AirtableFields } from "@/services/airtableService";

/**
 * POST /api/marketing-crm/contacts/save
 * Save Apollo contacts to Airtable.
 * Body: { contacts: Array<{ apollo_id, first_name, last_name, email, phone?, company, title, industry?, state?, city?, linkedin_url?, tags? }> }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      contacts: Array<{
        apollo_id?: string;
        first_name: string;
        last_name: string;
        email: string;
        phone?: string | null;
        company: string;
        title: string;
        industry?: string | null;
        state?: string | null;
        city?: string | null;
        linkedin_url?: string | null;
        tags?: string[];
      }>;
    };

    if (!body.contacts || !Array.isArray(body.contacts) || body.contacts.length === 0) {
      return NextResponse.json({ error: "contacts array is required" }, { status: 400 });
    }

    // Check for duplicates by email
    const toCreate: AirtableFields[] = [];
    const skipped: string[] = [];

    for (const c of body.contacts) {
      if (!c.email) {
        skipped.push(`${c.first_name} ${c.last_name} (no email)`);
        continue;
      }
      const existing = await findByEmail(c.email);
      if (existing) {
        skipped.push(`${c.first_name} ${c.last_name} (${c.email} already exists)`);
        continue;
      }

      const now = new Date().toISOString();
      toCreate.push({
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        phone: c.phone ?? undefined,
        company: c.company,
        title: c.title,
        industry: c.industry ?? undefined,
        state: c.state ?? undefined,
        city: c.city ?? undefined,
        linkedin_url: c.linkedin_url ?? undefined,
        source: "apollo",
        status: "new",
        tags: (c.tags ?? []).join(", "),
        apollo_id: c.apollo_id ?? undefined,
        created_at: now,
        updated_at: now,
      });
    }

    let created: Awaited<ReturnType<typeof createContacts>> = [];
    if (toCreate.length > 0) {
      created = await createContacts(toCreate);
    }

    return NextResponse.json({
      data: {
        saved: created.length,
        skipped: skipped.length,
        skipped_details: skipped,
        records: created,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Save contacts error:", message);

    // If Airtable env vars are missing, return helpful message
    if (message.includes("is not set")) {
      return NextResponse.json(
        { error: `Airtable configuration missing: ${message}. Set AIRTABLE_PAT, AIRTABLE_BASE_ID in .env.local` },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
