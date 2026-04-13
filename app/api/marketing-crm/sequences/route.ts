import { NextRequest, NextResponse } from "next/server";
import {
  isConfigured,
  listSequences,
  upsertSequence,
  deleteSequence,
  getSequence,
  type SequenceRow,
} from "@/services/airtableCrm";

// ── GET — list all sequences ────────────────────────────────────
export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json({ data: [], source: "not_configured" });
  }
  try {
    const sequences = await listSequences();
    return NextResponse.json({ data: sequences, source: "airtable" });
  } catch (err) {
    console.error("Sequences GET error:", err);
    return NextResponse.json({ error: "Failed to read sequences", data: [] }, { status: 500 });
  }
}

// ── POST — create or update a sequence ──────────────────────────
export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Airtable not configured" }, { status: 500 });
  }
  try {
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
    }

    const row: SequenceRow = {
      id: body._recordId || body.id || "",
      _recordId: body._recordId,
      name: body.name,
      description: body.description ?? "",
      sequence_type: body.sequence_type ?? "cold_instantly",
      target_segments: body.target_segments ?? [],
      target_states: body.target_states ?? [],
      estimated_contacts: body.estimated_contacts ?? 0,
      steps: body.steps ?? [],
      status: body.status ?? "draft",
      send_from_domain: body.send_from_domain ?? "outreach.tbpauto.com",
      created_by: body.created_by ?? "",
      approved_by: body.approved_by ?? null,
      approved_at: body.approved_at ?? null,
      created_at: body.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const saved = await upsertSequence(row);
    return NextResponse.json({ data: saved, status: body._recordId ? "updated" : "created" });
  } catch (err) {
    console.error("Sequences POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save sequence" },
      { status: 500 }
    );
  }
}

// ── DELETE — delete a sequence ──────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Airtable not configured" }, { status: 500 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await deleteSequence(id);
    return NextResponse.json({ data: { id, status: "deleted" } });
  } catch (err) {
    console.error("Sequences DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete sequence" }, { status: 500 });
  }
}
