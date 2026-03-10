import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/libs/supabase";
import type { Quote, ShippingDocument } from "@/types/shipping";

const PATCH_ALLOWED_KEYS = [
  "status",
  "carrier",
  "bl_number",
  "etd",
  "eta",
  "leg1_cost_vnd",
  "leg2_breakdown",
  "leg2_total_usd",
  "leg3_estimate_usd",
  "delivery_address",
  "delivery_city",
  "delivery_state",
  "delivery_zip",
  "special_remarks",
] as const;

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const { data: quote, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ data: null, error: "Quote not found" }, { status: 404 });
      }
      return NextResponse.json({ data: null, error: error.message }, { status: 500 });
    }

    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("*")
      .eq("quote_id", id)
      .order("doc_type");

    if (docsError) {
      return NextResponse.json({ data: null, error: docsError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: { quote: quote as Quote, documents: (documents ?? []) as ShippingDocument[] },
      error: null,
    });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ data: null, error: err.message }, { status: 500 });
    }
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of PATCH_ALLOWED_KEYS) {
      if (key in body && body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    const { data, error } = await supabase
      .from("quotes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ data: null, error: "Quote not found" }, { status: 404 });
      }
      return NextResponse.json({ data: null, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as Quote, error: null });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ data: null, error: err.message }, { status: 500 });
    }
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const { error } = await supabase.from("quotes").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: { id }, error: null });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ data: null, error: err.message }, { status: 500 });
    }
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
