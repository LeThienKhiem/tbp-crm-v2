import { NextRequest, NextResponse } from "next/server";
import { createContacts, findByEmail, type AirtableFields } from "@/services/airtableService";

// ── Column name mapping ──────────────────────────────────────────
const COLUMN_MAP: Record<string, string> = {
  // first_name
  first_name: "first_name",
  firstname: "first_name",
  "first name": "first_name",
  first: "first_name",
  // last_name
  last_name: "last_name",
  lastname: "last_name",
  "last name": "last_name",
  last: "last_name",
  // email
  email: "email",
  "email address": "email",
  emailaddress: "email",
  "e-mail": "email",
  // phone
  phone: "phone",
  "phone number": "phone",
  phonenumber: "phone",
  telephone: "phone",
  mobile: "phone",
  // company
  company: "company",
  "company name": "company",
  companyname: "company",
  organization: "company",
  organisation: "company",
  // title
  title: "title",
  "job title": "title",
  jobtitle: "title",
  position: "title",
  role: "title",
  // industry
  industry: "industry",
  // state
  state: "state",
  "state/region": "state",
  region: "state",
  // city
  city: "city",
  // linkedin_url
  linkedin_url: "linkedin_url",
  linkedinurl: "linkedin_url",
  linkedin: "linkedin_url",
  "linkedin url": "linkedin_url",
  "linkedin profile": "linkedin_url",
  // tags
  tags: "tags",
  tag: "tags",
  labels: "tags",
};

function normalizeColumnName(col: string): string | null {
  const key = col.trim().toLowerCase().replace(/[_\-]/g, " ").replace(/\s+/g, " ");
  // Try direct lookup
  if (COLUMN_MAP[key]) return COLUMN_MAP[key];
  // Try with underscores removed
  const noSpace = key.replace(/\s/g, "");
  if (COLUMN_MAP[noSpace]) return COLUMN_MAP[noSpace];
  return null;
}

// ── Simple CSV parser (handles quoted fields) ────────────────────
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(text: string): string[][] {
  // Normalize line endings and split
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  return lines
    .map((line) => parseCSVLine(line))
    .filter((row) => row.some((cell) => cell.length > 0));
}

/**
 * POST /api/marketing-crm/contacts/import-csv
 * Body: { csv_text: string }
 * Returns: { saved, skipped, errors, total_rows }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { csv_text: string };

    if (!body.csv_text || typeof body.csv_text !== "string") {
      return NextResponse.json({ error: "csv_text is required" }, { status: 400 });
    }

    const rows = parseCSV(body.csv_text);
    if (rows.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
    }

    // Map header columns
    const headerRow = rows[0];
    const columnMapping: (string | null)[] = headerRow.map((col) => normalizeColumnName(col));

    // Check we have at least email column
    if (!columnMapping.includes("email")) {
      return NextResponse.json(
        { error: `Could not find an email column. Headers found: ${headerRow.join(", ")}` },
        { status: 400 },
      );
    }

    const dataRows = rows.slice(1);
    const errors: string[] = [];
    const toCreate: AirtableFields[] = [];
    let skipped = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2; // 1-based, header is row 1

      // Build a record from the row
      const record: Record<string, string> = {};
      for (let j = 0; j < columnMapping.length; j++) {
        const field = columnMapping[j];
        if (field && j < row.length) {
          record[field] = row[j];
        }
      }

      // Skip rows without email
      if (!record.email || record.email.trim() === "") {
        skipped++;
        continue;
      }

      const email = record.email.trim().toLowerCase();

      // Basic email validation
      if (!email.includes("@") || !email.includes(".")) {
        errors.push(`Row ${rowNum}: invalid email "${record.email}"`);
        continue;
      }

      // Check for duplicates
      try {
        const existing = await findByEmail(email);
        if (existing) {
          skipped++;
          continue;
        }
      } catch {
        // If Airtable lookup fails, still try to create
      }

      const now = new Date().toISOString();
      toCreate.push({
        first_name: record.first_name || "",
        last_name: record.last_name || "",
        email,
        phone: record.phone || undefined,
        company: record.company || "",
        title: record.title || "",
        industry: record.industry || undefined,
        state: record.state || undefined,
        city: record.city || undefined,
        linkedin_url: record.linkedin_url || undefined,
        source: "apollo_csv",
        status: "new",
        tags: record.tags || "",
        created_at: now,
        updated_at: now,
      });
    }

    // Create in batches of 10
    let savedCount = 0;
    for (let i = 0; i < toCreate.length; i += 10) {
      const batch = toCreate.slice(i, i + 10);
      try {
        const created = await createContacts(batch);
        savedCount += created.length;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Batch ${Math.floor(i / 10) + 1} failed: ${msg}`);
      }
    }

    return NextResponse.json({
      saved: savedCount,
      skipped,
      errors,
      total_rows: dataRows.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Import CSV error:", message);

    if (message.includes("is not set")) {
      return NextResponse.json(
        { error: `Airtable configuration missing: ${message}. Set AIRTABLE_PAT, AIRTABLE_BASE_ID in .env.local` },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
