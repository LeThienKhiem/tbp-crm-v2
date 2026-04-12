import { NextRequest, NextResponse } from "next/server";

const PAT = process.env.AIRTABLE_PAT ?? "";
const BASE = process.env.AIRTABLE_BASE_ID ?? "";
const TABLE = process.env.AIRTABLE_CONTACT_GROUPS_TABLE ?? "";

const BASE_URL = `https://api.airtable.com/v0/${BASE}/${TABLE}`;

function headers() {
  return { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" };
}

export interface ContactGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  contact_count: number;
  created_by: string;
  created_at: string;
}

function fromRecord(rec: { id: string; fields: Record<string, unknown>; createdTime?: string }): ContactGroup {
  const f = rec.fields;
  return {
    id: rec.id,
    name: (f.name as string) ?? "",
    description: (f.description as string) ?? "",
    color: (f.color as string) ?? "blue",
    contact_count: (f.contact_count as number) ?? 0,
    created_by: (f.created_by as string) ?? "",
    created_at: (f.created_at as string) ?? rec.createdTime ?? "",
  };
}

// ── GET — list all groups ──
export async function GET() {
  if (!TABLE) {
    return NextResponse.json({ data: [], source: "not_configured" });
  }
  try {
    const res = await fetch(`${BASE_URL}?pageSize=100`, { headers: headers(), cache: "no-store" });
    if (!res.ok) throw new Error(`Airtable: ${res.status}`);
    const data = await res.json();
    const groups = (data.records ?? []).map(fromRecord);
    // Sort by name
    groups.sort((a: ContactGroup, b: ContactGroup) => a.name.localeCompare(b.name));
    return NextResponse.json({ data: groups, source: "airtable" });
  } catch (err) {
    console.error("Contact Groups GET error:", err);
    return NextResponse.json({ data: [], error: "Failed to load groups" }, { status: 500 });
  }
}

// ── POST — create a new group ──
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, color, created_by } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        records: [{
          fields: {
            name: name.trim(),
            description: description ?? "",
            color: color ?? "blue",
            contact_count: 0,
            created_by: created_by ?? "Marketing Team",
            created_at: new Date().toISOString(),
          },
        }],
        typecast: true,
      }),
    });
    if (!res.ok) throw new Error(`Airtable create: ${res.status}`);
    const data = await res.json();
    return NextResponse.json({ data: fromRecord(data.records[0]), status: "created" });
  } catch (err) {
    console.error("Contact Groups POST error:", err);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}

// ── PATCH — update group ──
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "Missing group id" }, { status: 400 });

    const fields: Record<string, unknown> = {};
    if (updates.name !== undefined) fields.name = updates.name;
    if (updates.description !== undefined) fields.description = updates.description;
    if (updates.color !== undefined) fields.color = updates.color;
    if (updates.contact_count !== undefined) fields.contact_count = updates.contact_count;

    const res = await fetch(BASE_URL, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ records: [{ id, fields }], typecast: true }),
    });
    if (!res.ok) throw new Error(`Airtable update: ${res.status}`);
    const data = await res.json();
    return NextResponse.json({ data: fromRecord(data.records[0]) });
  } catch (err) {
    console.error("Contact Groups PATCH error:", err);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

// ── DELETE — delete group ──
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing group id" }, { status: 400 });

    const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE", headers: headers() });
    if (!res.ok) throw new Error(`Airtable delete: ${res.status}`);
    return NextResponse.json({ data: { id, status: "deleted" } });
  } catch (err) {
    console.error("Contact Groups DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
