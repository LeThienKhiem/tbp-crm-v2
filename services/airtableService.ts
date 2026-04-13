/**
 * Airtable service for Marketing CRM contacts.
 * Uses Airtable REST API v0 with Personal Access Token.
 *
 * Required env vars:
 *   AIRTABLE_PAT        — Personal Access Token
 *   AIRTABLE_BASE_ID    — Base ID (starts with "app")
 *   AIRTABLE_TABLE_NAME — Table name (default: "Contact List")
 */

const AIRTABLE_BASE = "https://api.airtable.com/v0";

function getPat(): string {
  const pat = process.env.AIRTABLE_PAT;
  if (!pat) throw new Error("AIRTABLE_PAT is not set");
  return pat;
}

function getBaseId(): string {
  const id = process.env.AIRTABLE_BASE_ID;
  if (!id) throw new Error("AIRTABLE_BASE_ID is not set");
  return id;
}

function getTableName(): string {
  return process.env.AIRTABLE_TABLE_NAME ?? "Contact List";
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${getPat()}`,
    "Content-Type": "application/json",
  };
}

function tableUrl(): string {
  return `${AIRTABLE_BASE}/${getBaseId()}/${encodeURIComponent(getTableName())}`;
}

// ── Types ─────────────────────────────────────────────────────────

export interface AirtableContact {
  id: string; // Airtable record ID
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  company: string;
  title: string;
  industry?: string | null;
  state?: string | null;
  city?: string | null;
  linkedin_url?: string | null;
  source: string;
  status: string;
  tags: string; // comma-separated in Airtable
  notes?: string | null;
  apollo_id?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** Shape of a record as stored in Airtable fields. */
export interface AirtableFields {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company: string;
  title: string;
  industry?: string;
  state?: string;
  city?: string;
  linkedin_url?: string;
  source: string;
  status: string;
  tags: string; // comma-separated
  notes?: string;
  apollo_id?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────

function recordToContact(rec: { id: string; fields: Record<string, unknown> }): AirtableContact {
  const f = rec.fields;
  return {
    id: rec.id,
    first_name: String(f.first_name ?? ""),
    last_name: String(f.last_name ?? ""),
    email: String(f.email ?? ""),
    phone: f.phone ? String(f.phone) : null,
    company: String(f.company ?? ""),
    title: String(f.title ?? ""),
    industry: f.industry ? String(f.industry) : null,
    state: f.state ? String(f.state) : null,
    city: f.city ? String(f.city) : null,
    linkedin_url: f.linkedin_url ? String(f.linkedin_url) : null,
    notes: f.notes ? String(f.notes) : null,
    source: String(f.source ?? "apollo"),
    status: String(f.status ?? "new"),
    tags: String(f.tags ?? ""),
    apollo_id: f.apollo_id ? String(f.apollo_id) : null,
    approved_by: f.approved_by ? String(f.approved_by) : null,
    approved_at: f.approved_at ? String(f.approved_at) : null,
    created_at: String(f.created_at ?? new Date().toISOString()),
    updated_at: String(f.updated_at ?? new Date().toISOString()),
  };
}

// ── CRUD ──────────────────────────────────────────────────────────

/** List all contacts (paginated, returns all pages). */
export async function listContacts(): Promise<AirtableContact[]> {
  const all: AirtableContact[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(tableUrl());
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url.toString(), { method: "GET", headers: headers() });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Airtable list failed: ${res.status} ${text.slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      records: { id: string; fields: Record<string, unknown> }[];
      offset?: string;
    };
    for (const rec of data.records) {
      all.push(recordToContact(rec));
    }
    offset = data.offset;
  } while (offset);

  return all;
}

/** Create one or more contacts (max 10 per batch — Airtable limit). */
export async function createContacts(contacts: AirtableFields[]): Promise<AirtableContact[]> {
  const results: AirtableContact[] = [];

  // Airtable allows max 10 records per request
  for (let i = 0; i < contacts.length; i += 10) {
    const batch = contacts.slice(i, i + 10);
    const body = {
      records: batch.map((fields) => ({ fields })),
      typecast: true,
    };

    const res = await fetch(tableUrl(), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Airtable create failed: ${res.status} ${text.slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      records: { id: string; fields: Record<string, unknown> }[];
    };
    for (const rec of data.records) {
      results.push(recordToContact(rec));
    }
  }

  return results;
}

/** Update a single contact by record ID. */
export async function updateContact(
  recordId: string,
  fields: Partial<AirtableFields>,
): Promise<AirtableContact> {
  const res = await fetch(`${tableUrl()}/${recordId}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable update failed: ${res.status} ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as { id: string; fields: Record<string, unknown> };
  return recordToContact(data);
}

/** Delete contacts by record IDs. */
export async function deleteContacts(recordIds: string[]): Promise<void> {
  for (let i = 0; i < recordIds.length; i += 10) {
    const batch = recordIds.slice(i, i + 10);
    const url = new URL(tableUrl());
    for (const id of batch) url.searchParams.append("records[]", id);

    const res = await fetch(url.toString(), { method: "DELETE", headers: headers() });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Airtable delete failed: ${res.status} ${text.slice(0, 300)}`);
    }
  }
}

/** Find contact by email (returns first match or null). */
export async function findByEmail(email: string): Promise<AirtableContact | null> {
  const url = new URL(tableUrl());
  url.searchParams.set("filterByFormula", `{email} = "${email.replace(/"/g, '\\"')}"`);
  url.searchParams.set("maxRecords", "1");

  const res = await fetch(url.toString(), { method: "GET", headers: headers() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable search failed: ${res.status} ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    records: { id: string; fields: Record<string, unknown> }[];
  };
  return data.records.length > 0 ? recordToContact(data.records[0]) : null;
}
