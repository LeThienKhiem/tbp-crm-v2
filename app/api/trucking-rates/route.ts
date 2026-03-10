import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/libs/supabase";

// Haversine formula — returns straight-line distance in miles
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Port coordinates — hardcoded (ports don't move)
const PORT_COORDS: Record<string, [number, number]> = {
  USLAX: [33.7395, -118.2482],
  USLGB: [33.7395, -118.2482],
  USNYC: [40.684, -74.044],
  USSEA: [47.6162, -122.3485],
  USHOU: [29.7253, -95.2811],
  USSAV: [32.0835, -81.0998],
  USBAL: [39.2476, -76.5763],
  USORF: [36.9468, -76.3267],
  USCHA: [32.7834, -79.9433],
  USMIA: [25.7617, -80.1918],
  USOAK: [37.7955, -122.2782],
};

// GET /api/trucking-rates
// Query params:
//   port       — e.g. USLAX (required)
//   container  — e.g. 40HC (default: 40HC)
//   lat        — ZIP latitude (optional, for distance calc)
//   lng        — ZIP longitude (optional, for distance calc)
//   zip        — ZIP code string (optional, for response label only)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const portCode = (searchParams.get("port") ?? "USLAX").toUpperCase();
  const containerType = (searchParams.get("container") ?? "40HC").toUpperCase();
  const stateParam = searchParams.get("state")?.trim() ?? null;
  const zipCode = searchParams.get("zip")?.trim() ?? null;
  const zipLat = parseFloat(searchParams.get("lat") ?? "0");
  const zipLng = parseFloat(searchParams.get("lng") ?? "0");

  // 1. Fetch base rates from Supabase
  const { data: rateRow, error: rateError } = await supabase
    .from("trucking_rates")
    .select("base_low, base_mid, base_high")
    .eq("port_code", portCode)
    .eq("container_type", containerType)
    .maybeSingle();

  if (rateError) {
    return NextResponse.json({ data: null, error: rateError.message }, { status: 500 });
  }

  // Fallback if port/container combo not found
  const baseLow = rateRow?.base_low ?? 400;
  const baseMid = rateRow?.base_mid ?? 550;
  const baseHigh = rateRow?.base_high ?? 800;

  // 2. Calculate distance if coordinates provided
  let miles = 0;
  let multiplier = 1.0;
  let zone = 1;

  const portCoords = PORT_COORDS[portCode];
  if (portCoords && zipLat !== 0 && zipLng !== 0) {
    miles = Math.round(haversine(portCoords[0], portCoords[1], zipLat, zipLng));

    // Fetch zone multiplier from Supabase
    const { data: zoneRow } = await supabase
      .from("trucking_zones")
      .select("zone, multiplier")
      .lte("miles_from", miles)
      .gte("miles_to", miles)
      .maybeSingle();

    if (zoneRow) {
      multiplier = parseFloat(String(zoneRow.multiplier));
      zone = zoneRow.zone;
    }
  }

  // 3. Apply multiplier and round
  const low = Math.round(Number(baseLow) * multiplier);
  const mid = Math.round(Number(baseMid) * multiplier);
  const high = Math.round(Number(baseHigh) * multiplier);

  // 4. Warning for very long haul (different coast)
  const warning =
    miles > 1500
      ? `${miles} miles from ${portCode} — consider using a closer destination port`
      : null;

  return NextResponse.json({
    data: {
      portCode,
      containerType,
      state: stateParam ?? null,
      zipCode,
      miles,
      zone,
      multiplier,
      low,
      mid,
      high,
      warning,
      note: "Port-to-warehouse estimate. Final rate confirmed by carrier after booking.",
    },
    error: null,
  });
}
