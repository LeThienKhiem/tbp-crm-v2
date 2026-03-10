import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/libs/supabase";
import type { DocStatus, DocType, ShippingDocument } from "@/types/shipping";

type Params = { params: Promise<{ quoteId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { quoteId } = await params;

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("quote_id", quoteId)
      .order("doc_type");

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as ShippingDocument[], error: null });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ data: null, error: err.message }, { status: 500 });
    }
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { quoteId } = await params;
    const body = (await req.json()) as { doc_type: DocType; status: DocStatus; notes?: string };

    const { doc_type, status, notes } = body;

    if (!doc_type || !status) {
      return NextResponse.json(
        { data: null, error: "doc_type and status are required" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (notes !== undefined) {
      updates.notes = notes;
    }

    const { data, error } = await supabase
      .from("documents")
      .update(updates)
      .eq("quote_id", quoteId)
      .eq("doc_type", doc_type)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ data: null, error: "Document not found" }, { status: 404 });
      }
      return NextResponse.json({ data: null, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as ShippingDocument, error: null });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ data: null, error: err.message }, { status: 500 });
    }
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
