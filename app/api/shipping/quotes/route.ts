import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/libs/supabase";
import type { Quote } from "@/types/shipping";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = supabase
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }
    if (search && search.trim()) {
      const term = search.trim().replace(/%/g, "\\%");
      query = query.or(`id.ilike.%${term}%,customer_name.ilike.%${term}%`);
    }

    const { data: quotes, error } = await query;

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 });
    }

    if (!quotes?.length) {
      return NextResponse.json({ data: [], error: null });
    }

    const quoteIds = quotes.map((q) => q.id);
    const { data: doneDocs, error: docsError } = await supabase
      .from("documents")
      .select("quote_id")
      .eq("status", "done")
      .in("quote_id", quoteIds);

    if (docsError) {
      return NextResponse.json({ data: null, error: docsError.message }, { status: 500 });
    }

    const docsDoneByQuote: Record<string, number> = {};
    for (const row of doneDocs ?? []) {
      docsDoneByQuote[row.quote_id] = (docsDoneByQuote[row.quote_id] ?? 0) + 1;
    }

    const data: (Quote & { docs_done: number })[] = quotes.map((q) => ({
      ...q,
      docs_done: docsDoneByQuote[q.id] ?? 0,
    }));

    return NextResponse.json({ data, error: null });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ data: null, error: err.message }, { status: 500 });
    }
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Omit<Quote, "id" | "created_at" | "updated_at">;

    const year = new Date().getFullYear();
    const { count, error: countError } = await supabase
      .from("quotes")
      .select("*", { count: "exact", head: true })
      .like("id", `TBP-${year}-%`);

    if (countError) {
      return NextResponse.json({ data: null, error: countError.message }, { status: 500 });
    }

    const seq = String((count ?? 0) + 1).padStart(3, "0");
    const id = `TBP-${year}-${seq}`;

    const { data, error } = await supabase
      .from("quotes")
      .insert({ ...body, id })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as Quote, error: null }, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ data: null, error: err.message }, { status: 500 });
    }
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
