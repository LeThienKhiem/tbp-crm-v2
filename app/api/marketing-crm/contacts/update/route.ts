import { NextRequest, NextResponse } from "next/server";
import { updateContact } from "@/services/airtableService";

/**
 * PATCH /api/marketing-crm/contacts/update
 * Update one or more existing contacts in Airtable.
 * Body: { updates: Array<{ id: string (recordId), fields: { tags?, status?, ...} }> }
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      updates: Array<{
        id: string;
        fields: Record<string, unknown>;
      }>;
    };

    if (!body.updates || !Array.isArray(body.updates) || body.updates.length === 0) {
      return NextResponse.json({ error: "updates array is required" }, { status: 400 });
    }

    const results = [];
    const errors: string[] = [];

    for (const u of body.updates) {
      if (!u.id) {
        errors.push("Missing record id");
        continue;
      }
      try {
        // Convert tags array to comma-separated string for Airtable
        const fields = { ...u.fields };
        if (Array.isArray(fields.tags)) {
          fields.tags = (fields.tags as string[]).join(", ");
        }
        fields.updated_at = new Date().toISOString();
        const updated = await updateContact(u.id, fields);
        results.push(updated);
      } catch (err) {
        errors.push(`${u.id}: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    }

    return NextResponse.json({
      data: {
        updated: results.length,
        errors: errors.length,
        error_details: errors,
        records: results,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Update contacts error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
