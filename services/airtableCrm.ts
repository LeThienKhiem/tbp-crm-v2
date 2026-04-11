/**
 * Airtable CRM Service — Sequences, Approvals, Campaigns, Send Logs
 *
 * All tables live in the same Airtable base as Contact List.
 * JSON fields (steps, sequence_detail) are stored as stringified JSON in multilineText columns.
 */

const PAT = process.env.AIRTABLE_PAT ?? "";
const BASE = process.env.AIRTABLE_BASE_ID ?? "";
const TABLES = {
  sequences: process.env.AIRTABLE_SEQUENCES_TABLE ?? "",
  approvals: process.env.AIRTABLE_APPROVALS_TABLE ?? "",
  campaigns: process.env.AIRTABLE_CAMPAIGNS_TABLE ?? "",
  sendLogs: process.env.AIRTABLE_SENDLOGS_TABLE ?? "",
};

const BASE_URL = `https://api.airtable.com/v0/${BASE}`;

function headers() {
  return {
    Authorization: `Bearer ${PAT}`,
    "Content-Type": "application/json",
  };
}

export function isConfigured(): boolean {
  return !!(PAT && BASE && TABLES.sequences && TABLES.approvals);
}

// ── Generic helpers ──────────────────────────────────────────────

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime?: string;
}

interface AirtableListResponse {
  records: AirtableRecord[];
  offset?: string;
}

async function listAll(tableId: string, filterFormula?: string): Promise<AirtableRecord[]> {
  const all: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams();
    if (filterFormula) params.set("filterByFormula", filterFormula);
    if (offset) params.set("offset", offset);
    params.set("pageSize", "100");

    const res = await fetch(`${BASE_URL}/${tableId}?${params}`, { headers: headers(), cache: "no-store" });
    if (!res.ok) throw new Error(`Airtable list failed: ${res.status}`);
    const data: AirtableListResponse = await res.json();
    all.push(...data.records);
    offset = data.offset;
  } while (offset);

  return all;
}

async function createRecord(tableId: string, fields: Record<string, unknown>): Promise<AirtableRecord> {
  const res = await fetch(`${BASE_URL}/${tableId}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ records: [{ fields }], typecast: true }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Airtable create failed: ${res.status} ${errText}`);
  }
  const data = await res.json();
  return data.records[0];
}

async function updateRecord(tableId: string, recordId: string, fields: Record<string, unknown>): Promise<AirtableRecord> {
  const res = await fetch(`${BASE_URL}/${tableId}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ records: [{ id: recordId, fields }], typecast: true }),
  });
  if (!res.ok) throw new Error(`Airtable update failed: ${res.status}`);
  const data = await res.json();
  return data.records[0];
}

async function deleteRecord(tableId: string, recordId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${tableId}/${recordId}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Airtable delete failed: ${res.status}`);
}

// ═══════════════════════════════════════════════════════════════
// SEQUENCES
// ═══════════════════════════════════════════════════════════════

export interface SequenceRow {
  id: string;              // our app id (e.g. seq_123)
  _recordId?: string;      // Airtable record ID
  name: string;
  description?: string;
  sequence_type: string;
  target_segments: string[];
  target_states: string[];
  estimated_contacts: number;
  steps: unknown[];
  status: string;
  send_from_domain: string;
  created_by: string;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

function seqFromRecord(rec: AirtableRecord): SequenceRow {
  const f = rec.fields;
  return {
    id: (f.name as string) ? `${rec.id}` : rec.id, // use Airtable record ID as our ID
    _recordId: rec.id,
    name: (f.name as string) ?? "",
    description: (f.description as string) ?? "",
    sequence_type: (f.sequence_type as string) ?? "cold_instantly",
    target_segments: safeJsonParse(f.target_segments as string, []),
    target_states: safeJsonParse(f.target_states as string, []),
    estimated_contacts: (f.estimated_contacts as number) ?? 0,
    steps: safeJsonParse(f.steps_json as string, []),
    status: (f.status as string) ?? "draft",
    send_from_domain: (f.send_from_domain as string) ?? "outreach.tbpauto.com",
    created_by: (f.created_by as string) ?? "",
    approved_by: (f.approved_by as string) || null,
    approved_at: (f.approved_at as string) || null,
    created_at: (f.created_at as string) ?? rec.createdTime ?? "",
    updated_at: (f.updated_at as string) ?? "",
  };
}

function seqToFields(seq: Partial<SequenceRow>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  if (seq.name !== undefined) fields.name = seq.name;
  if (seq.description !== undefined) fields.description = seq.description;
  if (seq.sequence_type !== undefined) fields.sequence_type = seq.sequence_type;
  if (seq.target_segments !== undefined) fields.target_segments = JSON.stringify(seq.target_segments);
  if (seq.target_states !== undefined) fields.target_states = JSON.stringify(seq.target_states);
  if (seq.estimated_contacts !== undefined) fields.estimated_contacts = seq.estimated_contacts;
  if (seq.steps !== undefined) fields.steps_json = JSON.stringify(seq.steps);
  if (seq.status !== undefined) fields.status = seq.status;
  if (seq.send_from_domain !== undefined) fields.send_from_domain = seq.send_from_domain;
  if (seq.created_by !== undefined) fields.created_by = seq.created_by;
  if (seq.approved_by !== undefined) fields.approved_by = seq.approved_by ?? "";
  if (seq.approved_at !== undefined) fields.approved_at = seq.approved_at ?? "";
  if (seq.created_at !== undefined) fields.created_at = seq.created_at;
  if (seq.updated_at !== undefined) fields.updated_at = seq.updated_at;
  return fields;
}

export async function listSequences(): Promise<SequenceRow[]> {
  const records = await listAll(TABLES.sequences);
  return records.map(seqFromRecord);
}

export async function getSequence(recordId: string): Promise<SequenceRow | null> {
  try {
    const res = await fetch(`${BASE_URL}/${TABLES.sequences}/${recordId}`, { headers: headers(), cache: "no-store" });
    if (!res.ok) return null;
    const rec: AirtableRecord = await res.json();
    return seqFromRecord(rec);
  } catch {
    return null;
  }
}

export async function upsertSequence(seq: SequenceRow): Promise<SequenceRow> {
  const fields = seqToFields({ ...seq, updated_at: new Date().toISOString() });

  // If _recordId exists, update. Otherwise search by name or create.
  if (seq._recordId) {
    const rec = await updateRecord(TABLES.sequences, seq._recordId, fields);
    return seqFromRecord(rec);
  }

  // Try to find existing by matching our app id stored in created_at+name combo
  // Simpler: always create new
  if (!fields.created_at) fields.created_at = new Date().toISOString();
  const rec = await createRecord(TABLES.sequences, fields);
  return seqFromRecord(rec);
}

export async function deleteSequence(recordId: string): Promise<void> {
  await deleteRecord(TABLES.sequences, recordId);
}

// ═══════════════════════════════════════════════════════════════
// APPROVALS
// ═══════════════════════════════════════════════════════════════

export interface ApprovalRow {
  id: string;
  _recordId?: string;
  type: string;
  reference_id: string;
  title: string;
  description: string;
  submitted_by: string;
  submitted_at: string;
  status: string;
  reviewed_at?: string | null;
  reviewer_notes?: string | null;
  sequence_detail?: unknown;
}

function aprFromRecord(rec: AirtableRecord): ApprovalRow {
  const f = rec.fields;
  return {
    id: rec.id,
    _recordId: rec.id,
    type: (f.type as string) ?? "contact",
    reference_id: (f.reference_id as string) ?? "",
    title: (f.title as string) ?? "",
    description: (f.description as string) ?? "",
    submitted_by: (f.submitted_by as string) ?? "",
    submitted_at: (f.submitted_at as string) ?? "",
    status: (f.status as string) ?? "pending",
    reviewed_at: (f.reviewed_at as string) || null,
    reviewer_notes: (f.reviewer_notes as string) || null,
    sequence_detail: safeJsonParse(f.sequence_detail_json as string, null),
  };
}

function aprToFields(apr: Partial<ApprovalRow>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  if (apr.type !== undefined) fields.type = apr.type;
  if (apr.reference_id !== undefined) fields.reference_id = apr.reference_id;
  if (apr.title !== undefined) fields.title = apr.title;
  if (apr.description !== undefined) fields.description = apr.description;
  if (apr.submitted_by !== undefined) fields.submitted_by = apr.submitted_by;
  if (apr.submitted_at !== undefined) fields.submitted_at = apr.submitted_at;
  if (apr.status !== undefined) fields.status = apr.status;
  if (apr.reviewed_at !== undefined) fields.reviewed_at = apr.reviewed_at ?? "";
  if (apr.reviewer_notes !== undefined) fields.reviewer_notes = apr.reviewer_notes ?? "";
  if (apr.sequence_detail !== undefined) fields.sequence_detail_json = apr.sequence_detail ? JSON.stringify(apr.sequence_detail) : "";
  return fields;
}

export async function listApprovals(status?: string): Promise<ApprovalRow[]> {
  const formula = status ? `{status}="${status}"` : undefined;
  const records = await listAll(TABLES.approvals, formula);
  return records.map(aprFromRecord);
}

export async function createApproval(apr: Omit<ApprovalRow, "id" | "_recordId">): Promise<ApprovalRow> {
  const fields = aprToFields(apr);
  const rec = await createRecord(TABLES.approvals, fields);
  return aprFromRecord(rec);
}

export async function updateApproval(recordId: string, updates: Partial<ApprovalRow>): Promise<ApprovalRow> {
  const fields = aprToFields(updates);
  const rec = await updateRecord(TABLES.approvals, recordId, fields);
  return aprFromRecord(rec);
}

// ═══════════════════════════════════════════════════════════════
// CAMPAIGNS
// ═══════════════════════════════════════════════════════════════

export interface CampaignRow {
  id: string;
  _recordId?: string;
  name: string;
  sequence_id: string;
  sequence_name: string;
  instantly_campaign_id: string;
  status: string;
  total_leads: number;
  emails_sent: number;
  opens: number;
  replies: number;
  bounces: number;
  deployed_by: string;
  deployed_at: string;
  settings?: unknown;
}

function campFromRecord(rec: AirtableRecord): CampaignRow {
  const f = rec.fields;
  return {
    id: rec.id,
    _recordId: rec.id,
    name: (f.name as string) ?? "",
    sequence_id: (f.sequence_id as string) ?? "",
    sequence_name: (f.sequence_name as string) ?? "",
    instantly_campaign_id: (f.instantly_campaign_id as string) ?? "",
    status: (f.status as string) ?? "deployed",
    total_leads: (f.total_leads as number) ?? 0,
    emails_sent: (f.emails_sent as number) ?? 0,
    opens: (f.opens as number) ?? 0,
    replies: (f.replies as number) ?? 0,
    bounces: (f.bounces as number) ?? 0,
    deployed_by: (f.deployed_by as string) ?? "",
    deployed_at: (f.deployed_at as string) ?? "",
    settings: safeJsonParse(f.settings_json as string, null),
  };
}

export async function listCampaigns(): Promise<CampaignRow[]> {
  const records = await listAll(TABLES.campaigns);
  return records.map(campFromRecord);
}

export async function createCampaign(camp: Omit<CampaignRow, "id" | "_recordId">): Promise<CampaignRow> {
  const fields: Record<string, unknown> = {
    name: camp.name,
    sequence_id: camp.sequence_id,
    sequence_name: camp.sequence_name,
    instantly_campaign_id: camp.instantly_campaign_id,
    status: camp.status,
    total_leads: camp.total_leads,
    emails_sent: camp.emails_sent,
    opens: camp.opens,
    replies: camp.replies,
    bounces: camp.bounces,
    deployed_by: camp.deployed_by,
    deployed_at: camp.deployed_at,
    settings_json: camp.settings ? JSON.stringify(camp.settings) : "",
  };
  const rec = await createRecord(TABLES.campaigns, fields);
  return campFromRecord(rec);
}

export async function updateCampaignStats(recordId: string, stats: Partial<CampaignRow>): Promise<CampaignRow> {
  const fields: Record<string, unknown> = {};
  if (stats.status !== undefined) fields.status = stats.status;
  if (stats.total_leads !== undefined) fields.total_leads = stats.total_leads;
  if (stats.emails_sent !== undefined) fields.emails_sent = stats.emails_sent;
  if (stats.opens !== undefined) fields.opens = stats.opens;
  if (stats.replies !== undefined) fields.replies = stats.replies;
  if (stats.bounces !== undefined) fields.bounces = stats.bounces;
  const rec = await updateRecord(TABLES.campaigns, recordId, fields);
  return campFromRecord(rec);
}

// ═══════════════════════════════════════════════════════════════
// SEND LOGS
// ═══════════════════════════════════════════════════════════════

export interface SendLogRow {
  id: string;
  _recordId?: string;
  contact_email: string;
  contact_name: string;
  contact_company: string;
  campaign_id: string;
  campaign_name: string;
  sequence_step: number;
  subject: string;
  body_preview: string;
  status: string;
  sent_at: string;
  opened_at?: string | null;
  replied_at?: string | null;
  instantly_lead_id?: string;
}

function logFromRecord(rec: AirtableRecord): SendLogRow {
  const f = rec.fields;
  return {
    id: rec.id,
    _recordId: rec.id,
    contact_email: (f.contact_email as string) ?? "",
    contact_name: (f.contact_name as string) ?? "",
    contact_company: (f.contact_company as string) ?? "",
    campaign_id: (f.campaign_id as string) ?? "",
    campaign_name: (f.campaign_name as string) ?? "",
    sequence_step: (f.sequence_step as number) ?? 1,
    subject: (f.subject as string) ?? "",
    body_preview: (f.body_preview as string) ?? "",
    status: (f.status as string) ?? "queued",
    sent_at: (f.sent_at as string) ?? "",
    opened_at: (f.opened_at as string) || null,
    replied_at: (f.replied_at as string) || null,
    instantly_lead_id: (f.instantly_lead_id as string) ?? "",
  };
}

export async function listSendLogs(campaignId?: string): Promise<SendLogRow[]> {
  const formula = campaignId ? `{campaign_id}="${campaignId}"` : undefined;
  const records = await listAll(TABLES.sendLogs, formula);
  return records.map(logFromRecord);
}

export async function createSendLogs(logs: Omit<SendLogRow, "id" | "_recordId">[]): Promise<SendLogRow[]> {
  // Airtable allows max 10 records per request
  const results: SendLogRow[] = [];
  for (let i = 0; i < logs.length; i += 10) {
    const batch = logs.slice(i, i + 10);
    const records = batch.map((log) => ({
      fields: {
        contact_email: log.contact_email,
        contact_name: log.contact_name,
        contact_company: log.contact_company,
        campaign_id: log.campaign_id,
        campaign_name: log.campaign_name,
        sequence_step: log.sequence_step,
        subject: log.subject,
        body_preview: log.body_preview.slice(0, 500),
        status: log.status,
        sent_at: log.sent_at,
        opened_at: log.opened_at ?? "",
        replied_at: log.replied_at ?? "",
        instantly_lead_id: log.instantly_lead_id ?? "",
      },
    }));

    const res = await fetch(`${BASE_URL}/${TABLES.sendLogs}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ records, typecast: true }),
    });
    if (!res.ok) throw new Error(`Airtable batch create failed: ${res.status}`);
    const data = await res.json();
    results.push(...data.records.map(logFromRecord));
  }
  return results;
}

export async function updateSendLog(recordId: string, updates: Partial<SendLogRow>): Promise<void> {
  const fields: Record<string, unknown> = {};
  if (updates.status !== undefined) fields.status = updates.status;
  if (updates.opened_at !== undefined) fields.opened_at = updates.opened_at;
  if (updates.replied_at !== undefined) fields.replied_at = updates.replied_at;
  if (updates.sent_at !== undefined) fields.sent_at = updates.sent_at;
  await updateRecord(TABLES.sendLogs, recordId, fields);
}

// ── Utility ──────────────────────────────────────────────────────

function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}
