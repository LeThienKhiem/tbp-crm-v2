/**
 * Instantly.ai API v2 Service
 * Full integration for campaigns, leads, accounts, and analytics.
 */

const BASE_URL = "https://api.instantly.ai/api/v2";

function getHeaders(): Record<string, string> {
  const key = process.env.INSTANTLY_API_KEY;
  if (!key) throw new Error("INSTANTLY_API_KEY is not configured");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export function isConfigured(): boolean {
  return !!process.env.INSTANTLY_API_KEY;
}

// ── Generic helpers ──────────────────────────────────────────

async function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => v && url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Instantly GET ${path} → ${res.status}: ${body}`);
  }
  return res.json();
}

async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly POST ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly PATCH ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly DELETE ${path} → ${res.status}: ${text}`);
  }
}

// ── Type definitions ─────────────────────────────────────────

export interface InstantlyCampaign {
  id: string;
  name: string;
  status: number; // 0=Draft,1=Active,2=Paused,3=Completed,-1=Unhealthy,-2=BounceProtect
  sequences?: InstantlySequenceStep[];
  email_list?: string[];
  campaign_schedule?: {
    start_date?: string | null;
    end_date?: string | null;
    schedules: {
      name: string;
      timing: { from: string; to: string };
      days: Record<string, boolean>;
      timezone: string;
    }[];
  };
  daily_limit?: number;
  stop_on_reply?: boolean;
  stop_on_auto_reply?: boolean;
  link_tracking?: boolean;
  open_tracking?: boolean;
  text_only?: boolean;
  email_gap?: number;
  random_wait_max?: number;
  created_at?: string;
  updated_at?: string;
  timestamp_created?: string;
  timestamp_updated?: string;
}

export interface InstantlySequenceStep {
  delay?: number;
  delay_unit?: string;
  type?: string;
  variants?: {
    subject: string;
    body: string;
    v_disabled?: boolean;
  }[];
}

export interface CampaignAnalytics {
  campaign_name: string;
  campaign_id: string;
  campaign_status: number;
  leads_count: number;
  contacted_count: number;
  emails_sent_count: number;
  new_leads_contacted_count: number;
  open_count: number;
  open_count_unique: number;
  reply_count: number;
  reply_count_unique: number;
  link_click_count: number;
  link_click_count_unique: number;
  bounced_count: number;
  unsubscribed_count: number;
  completed_count: number;
  total_opportunities: number;
  total_opportunity_value: number;
}

export interface InstantlyAccount {
  email: string;
  status: number; // 1=Active,2=Paused,3=Maintenance,-1=ConnError,-2=SoftBounce,-3=SendError
  first_name?: string;
  last_name?: string;
  daily_limit?: number;
  sending_gap?: number;
  warmup_status?: number;
  warmup?: {
    warmup_limit?: number;
    warmup_increment?: number;
    warmup_reply_rate?: number;
  };
  provider_code?: number;
  timestamp_created?: string;
  timestamp_updated?: string;
}

export interface InstantlyLead {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  job_title?: string;
  phone?: string;
  website?: string;
  status?: number;
  lead_status?: number;
  lt_interest_status?: number;
  email_sent_count?: number;
  email_open_count?: number;
  email_reply_count?: number;
  email_click_count?: number;
  timestamp_created?: string;
  timestamp_last_email_sent?: string;
}

export interface InstantlyEmail {
  id: string;
  timestamp_created: string;
  from_address_email: string;
  to_address_email: string;
  subject: string;
  body?: { html?: string; text?: string };
  email_type: string; // "sent" | "received" | "manual"
  is_unread?: boolean;
  campaign_id?: string;
  lead_id?: string;
  thread_id?: string;
}

// ── Campaigns ────────────────────────────────────────────────

export async function listCampaigns(limit = 100): Promise<InstantlyCampaign[]> {
  const all: InstantlyCampaign[] = [];
  let cursor: string | undefined;
  do {
    const params: Record<string, string> = { limit: String(limit) };
    if (cursor) params.starting_after = cursor;
    const res = await apiGet<{ items: InstantlyCampaign[]; next_starting_after?: string }>(
      "/campaigns",
      params
    );
    all.push(...(res.items || []));
    cursor = res.next_starting_after || undefined;
  } while (cursor);
  return all;
}

export async function getCampaign(id: string): Promise<InstantlyCampaign> {
  return apiGet<InstantlyCampaign>(`/campaigns/${id}`);
}

export interface CreateCampaignInput {
  name: string;
  sequences?: InstantlySequenceStep[];
  email_list?: string[];
  daily_limit?: number;
  stop_on_reply?: boolean;
  link_tracking?: boolean;
  open_tracking?: boolean;
  text_only?: boolean;
  email_gap?: number;
  campaign_schedule: {
    start_date?: string | null;
    end_date?: string | null;
    schedules: {
      name: string;
      timing: { from: string; to: string };
      days: Record<string, boolean>;
      timezone: string;
    }[];
  };
}

export async function createCampaign(input: CreateCampaignInput): Promise<InstantlyCampaign> {
  return apiPost<InstantlyCampaign>("/campaigns", input);
}

export async function updateCampaign(
  id: string,
  updates: Partial<CreateCampaignInput> & { name?: string }
): Promise<InstantlyCampaign> {
  return apiPatch<InstantlyCampaign>(`/campaigns/${id}`, updates);
}

export async function deleteCampaign(id: string): Promise<void> {
  return apiDelete(`/campaigns/${id}`);
}

export async function activateCampaign(id: string): Promise<InstantlyCampaign> {
  return apiPost<InstantlyCampaign>(`/campaigns/${id}/activate`);
}

export async function pauseCampaign(id: string): Promise<InstantlyCampaign> {
  return apiPost<InstantlyCampaign>(`/campaigns/${id}/pause`);
}

// ── Campaign Analytics ───────────────────────────────────────

export async function getCampaignAnalytics(
  campaignId?: string,
  campaignIds?: string[],
  startDate?: string,
  endDate?: string
): Promise<CampaignAnalytics[]> {
  const params: Record<string, string> = {};
  if (campaignId) params.id = campaignId;
  if (campaignIds?.length) params.ids = campaignIds.join(",");
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  return apiGet<CampaignAnalytics[]>("/campaigns/analytics", params);
}

export async function getCampaignAnalyticsOverview(
  campaignIds?: string[],
  startDate?: string,
  endDate?: string
): Promise<CampaignAnalytics> {
  const params: Record<string, string> = {};
  if (campaignIds?.length) params.ids = campaignIds.join(",");
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  return apiGet<CampaignAnalytics>("/campaigns/analytics/overview", params);
}

// ── Accounts (Sending) ──────────────────────────────────────

export async function listAccounts(limit = 100): Promise<InstantlyAccount[]> {
  const all: InstantlyAccount[] = [];
  let cursor: string | undefined;
  do {
    const params: Record<string, string> = { limit: String(limit) };
    if (cursor) params.starting_after = cursor;
    const res = await apiGet<{ items: InstantlyAccount[]; next_starting_after?: string }>(
      "/accounts",
      params
    );
    all.push(...(res.items || []));
    cursor = res.next_starting_after || undefined;
  } while (cursor);
  return all;
}

export async function getAccount(email: string): Promise<InstantlyAccount> {
  return apiGet<InstantlyAccount>(`/accounts/${encodeURIComponent(email)}`);
}

export async function pauseAccount(email: string): Promise<void> {
  await apiPost(`/accounts/${encodeURIComponent(email)}/pause`);
}

export async function resumeAccount(email: string): Promise<void> {
  await apiPost(`/accounts/${encodeURIComponent(email)}/resume`);
}

// ── Leads ────────────────────────────────────────────────────

export async function addLeadToCampaign(
  campaignId: string,
  lead: {
    email: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    job_title?: string;
    phone?: string;
    website?: string;
    personalization?: string;
    custom_variables?: Record<string, string>;
  }
): Promise<InstantlyLead> {
  return apiPost<InstantlyLead>("/leads", {
    campaign: campaignId,
    ...lead,
    skip_if_in_campaign: true,
  });
}

export async function addLeadsBulk(
  campaignId: string,
  leads: {
    email: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    job_title?: string;
    phone?: string;
    custom_variables?: Record<string, string>;
  }[]
): Promise<{
  status: string;
  total_sent: number;
  leads_uploaded: number;
  duplicated_leads: number;
  skipped_count: number;
  invalid_email_count: number;
}> {
  return apiPost("/leads/add", {
    campaign_id: campaignId,
    leads,
    skip_if_in_campaign: true,
  });
}

export async function listLeads(
  campaignId?: string,
  limit = 100,
  search?: string
): Promise<InstantlyLead[]> {
  const body: Record<string, unknown> = { limit };
  if (campaignId) body.campaign = campaignId;
  if (search) body.search = search;
  const res = await apiPost<{ items: InstantlyLead[]; next_starting_after?: string }>(
    "/leads/list",
    body
  );
  return res.items || [];
}

export async function updateLeadInterest(
  leadId: string,
  interestStatus: number
): Promise<void> {
  await apiPatch(`/leads/${leadId}/interest-status`, {
    lt_interest_status: interestStatus,
  });
}

// ── Emails (Unibox) ─────────────────────────────────────────

export async function listEmails(
  campaignId?: string,
  limit = 50,
  emailType?: "received" | "sent" | "manual"
): Promise<InstantlyEmail[]> {
  const params: Record<string, string> = { limit: String(limit) };
  if (campaignId) params.campaign_id = campaignId;
  if (emailType) params.email_type = emailType;
  return apiGet<{ items: InstantlyEmail[] }>("/emails", params).then((r) => r.items || []);
}

export async function getUnreadCount(): Promise<number> {
  const res = await apiGet<{ count: number }>("/emails/unread/count");
  return res.count || 0;
}

// ── Status helpers ───────────────────────────────────────────

export function campaignStatusLabel(status: number): string {
  const map: Record<number, string> = {
    0: "Draft",
    1: "Active",
    2: "Paused",
    3: "Completed",
    4: "Running Subsequences",
    [-1]: "Accounts Unhealthy",
    [-2]: "Bounce Protect",
    [-99]: "Suspended",
  };
  return map[status] ?? `Unknown (${status})`;
}

export function accountStatusLabel(status: number): string {
  const map: Record<number, string> = {
    1: "Active",
    2: "Paused",
    3: "Maintenance",
    [-1]: "Connection Error",
    [-2]: "Soft Bounce",
    [-3]: "Sending Error",
  };
  return map[status] ?? `Unknown (${status})`;
}

export function interestStatusLabel(status: number): string {
  const map: Record<number, string> = {
    0: "None",
    1: "Interested",
    2: "Meeting Booked",
    3: "Meeting Completed",
    4: "Closed",
    [-1]: "Wrong Person",
    [-2]: "Not Interested",
    [-3]: "Out of Office",
    [-4]: "Do Not Contact",
  };
  return map[status] ?? `Unknown (${status})`;
}
