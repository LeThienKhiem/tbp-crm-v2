import { NextResponse } from "next/server";

export type FredDataPoint = {
  date: string;
  sales: number | null;
  parts_cost_index: number | null;
};

type FredObservation = {
  date?: string;
  value?: string;
};

type FredResponse = {
  observations?: FredObservation[];
};

function toYearMonth(dateStr: string): string {
  const match = dateStr.match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : dateStr;
}

function parseValue(v: string | undefined): number | null {
  if (v == null || v === "." || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET() {
  try {
    const apiKey = process.env.FRED_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "FRED_API_KEY is not set. Add it to .env.local." },
        { status: 500 }
      );
    }

    const base = "https://api.stlouisfed.org/fred/series/observations";
    const params = (seriesId: string) =>
      `?series_id=${seriesId}&api_key=${encodeURIComponent(apiKey)}&file_type=json&sort_order=desc&limit=12`;

    let salesRes: Response;
    let ppiRes: Response;
    try {
      [salesRes, ppiRes] = await Promise.all([
        fetch(base + params("HTRUCKSSAAR"), { next: { revalidate: 86400 } }),
        fetch(base + params("PCU331511331511"), { next: { revalidate: 86400 } }),
      ]);
    } catch (fetchErr) {
      console.error("FRED fetch error:", fetchErr);
      return NextResponse.json(
        { error: fetchErr instanceof Error ? fetchErr.message : "FRED request failed" },
        { status: 502 }
      );
    }

    if (!salesRes.ok) {
      const errText = await salesRes.text();
      console.error("FRED Error (HTRUCKSSAAR):", errText);
      return NextResponse.json(
        { error: "FRED request failed for truck sales series" },
        { status: 502 }
      );
    }
    if (!ppiRes.ok) {
      const errText = await ppiRes.text();
      console.error("FRED Error (PCU331511331511):", errText);
      return NextResponse.json(
        { error: "FRED request failed for PPI series" },
        { status: 502 }
      );
    }

    const salesData = (await salesRes.json()) as FredResponse;
    const ppiData = (await ppiRes.json()) as FredResponse;

    const salesObs = salesData.observations ?? [];
    const ppiObs = ppiData.observations ?? [];

    const byMonth: Record<
      string,
      { sales: number | null; parts_cost_index: number | null }
    > = {};

    for (const o of salesObs) {
      if (o.value === "." || o.value == null) continue;
      const ym = toYearMonth(o.date ?? "");
      if (!ym) continue;
      const val = parseValue(o.value);
      if (val == null) continue;
      if (!byMonth[ym]) byMonth[ym] = { sales: null, parts_cost_index: null };
      byMonth[ym].sales = val;
    }
    for (const o of ppiObs) {
      if (o.value === "." || o.value == null) continue;
      const ym = toYearMonth(o.date ?? "");
      if (!ym) continue;
      const val = parseValue(o.value);
      if (val == null) continue;
      if (!byMonth[ym]) byMonth[ym] = { sales: null, parts_cost_index: null };
      byMonth[ym].parts_cost_index = val;
    }

    const allMonths = Object.keys(byMonth).sort();
    if (allMonths.length === 0) {
      return NextResponse.json([]);
    }

    let lastSales: number | null = null;
    let lastPpi: number | null = null;
    for (const date of allMonths) {
      const row = byMonth[date];
      if (row.sales != null) lastSales = row.sales;
      else if (lastSales != null) row.sales = lastSales;
      if (row.parts_cost_index != null) lastPpi = row.parts_cost_index;
      else if (lastPpi != null) row.parts_cost_index = lastPpi;
    }

    const last6Months = allMonths.slice(-6);
    const combined: FredDataPoint[] = last6Months
      .filter((date) => {
        const row = byMonth[date];
        return row.sales != null || row.parts_cost_index != null;
      })
      .map((date) => {
        const row = byMonth[date];
        return {
          date,
          sales: row.sales ?? null,
          parts_cost_index: row.parts_cost_index ?? null,
        };
      });

    return NextResponse.json(combined);
  } catch (error) {
    console.error("FRED data error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
