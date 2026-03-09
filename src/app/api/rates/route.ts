import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

type Rate = {
  id: number;
  region: string;
  port: string;
  baseFreight: number;
  thc: number;
  bunker: number;
  pss: number;
  transit: string;
  trend: string;
};

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), "src", "data", "rates.csv");
    const fileContent = await fs.readFile(csvPath, "utf8");
    const lines = fileContent.split(/\r?\n/).filter((line) => line.trim() !== "");

    if (lines.length <= 1) {
      return NextResponse.json([]);
    }

    const headers = parseCsvLine(lines[0]);
    const rates: Rate[] = lines.slice(1).map((line) => {
      const values = parseCsvLine(line);
      const row = headers.reduce<Record<string, string>>((acc, header, index) => {
        acc[header] = values[index] ?? "";
        return acc;
      }, {});

      return {
        id: Number(row.id),
        region: row.region,
        port: row.port,
        baseFreight: Number(row.baseFreight),
        thc: Number(row.thc),
        bunker: Number(row.bunker),
        pss: Number(row.pss),
        transit: row.transit,
        trend: row.trend,
      };
    });

    return NextResponse.json(rates);
  } catch {
    return NextResponse.json(
      { error: "Unable to read rates data." },
      { status: 500 },
    );
  }
}
