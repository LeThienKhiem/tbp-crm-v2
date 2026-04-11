import { NextRequest, NextResponse } from "next/server";
import {
  isConfigured,
  listApprovals,
  createApproval,
  updateApproval,
} from "@/services/airtableCrm";

// ── GET — list approvals ────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ data: [], source: "not_configured" });
  }
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const approvals = await listApprovals(status);
    return NextResponse.json({ data: approvals, source: "airtable" });
  } catch (err) {
    console.error("Approvals GET error:", err);
    return NextResponse.json({ error: "Failed to read approvals", data: [] }, { status: 500 });
  }
}

// ── POST — create a new approval item ───────────────────────────
export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Airtable not configured" }, { status: 500 });
  }
  try {
    const body = await req.json();
    if (!body.type || !body.title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const created = await createApproval({
      type: body.type,
      reference_id: body.reference_id ?? "",
      title: body.title,
      description: body.description ?? "",
      submitted_by: body.submitted_by ?? "",
      submitted_at: body.submitted_at ?? new Date().toISOString(),
      status: "pending",
      reviewed_at: null,
      reviewer_notes: null,
      sequence_detail: body.sequence_detail ?? null,
    });

    return NextResponse.json({ data: created, status: "created" });
  } catch (err) {
    console.error("Approvals POST error:", err);
    return NextResponse.json({ error: "Failed to create approval" }, { status: 500 });
  }
}

// ── PATCH — update approval status (approve/reject) ─────────────
export async function PATCH(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Airtable not configured" }, { status: 500 });
  }
  try {
    const body = await req.json();
    const { id, status, reviewer_notes } = body as { id: string; status: string; reviewer_notes?: string };

    if (!id || !status) {
      return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
    }

    const updated = await updateApproval(id, {
      status,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: reviewer_notes ?? null,
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("Approvals PATCH error:", err);
    return NextResponse.json({ error: "Failed to update approval" }, { status: 500 });
  }
}
