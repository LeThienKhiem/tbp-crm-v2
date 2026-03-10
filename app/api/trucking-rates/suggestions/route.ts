import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/libs/supabase";

// GET /api/trucking-rates/suggestions?port=USLAX
// Returns list of popular ZIP destinations for a given port
export async function GET(req: NextRequest) {
  const port = (req.nextUrl.searchParams.get("port") ?? "USLAX").toUpperCase();

  const { data, error } = await supabase
    .from("port_zip_suggestions")
    .select("zip_code, city, state, lat, lng, label")
    .eq("port_code", port)
    .order("label", { ascending: true });

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], error: null });
}
