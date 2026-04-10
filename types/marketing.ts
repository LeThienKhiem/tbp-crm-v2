// ── Contact types ─────────────────────────────────────────────
export type ContactStatus = "new" | "approved" | "rejected" | "in_sequence" | "replied";
export type ContactSource = "apollo_csv" | "manual" | "linkedin" | "website";

export interface Contact {
  id: string;
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
  source: ContactSource;
  status: ContactStatus;
  tags: string[];
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

// ── Sequence types ────────────────────────────────────────────
export type SequenceStatus = "draft" | "pending_approval" | "approved" | "active" | "paused" | "completed";
export type StepType = "email" | "wait" | "condition";

export interface SequenceStep {
  id: string;
  order: number;
  type: StepType;
  subject?: string;
  body?: string;
  wait_days?: number;
  condition?: string;
}

export interface Sequence {
  id: string;
  name: string;
  description?: string;
  steps: SequenceStep[];
  status: SequenceStatus;
  send_from_domain: "outreach.tbpauto.com";
  created_by: string;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

// ── Campaign types ────────────────────────────────────────────
export type CampaignStatus = "draft" | "pending_approval" | "approved" | "sending" | "active" | "paused" | "completed";
export type CampaignPlatform = "instantly" | "lemlist";

export interface CampaignStats {
  total_sent: number;
  delivered: number;
  opened: number;
  replied: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
}

export interface Campaign {
  id: string;
  name: string;
  sequence_id: string;
  sequence_name: string;
  platform: CampaignPlatform;
  status: CampaignStatus;
  contact_count: number;
  stats: CampaignStats;
  send_from: string;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

// ── Lead Pipeline types ───────────────────────────────────────
export type LeadStage = "cold" | "warm" | "hot" | "sql" | "deal";

export interface PipelineLead {
  id: string;
  contact_id: string;
  contact_name: string;
  company: string;
  title: string;
  email: string;
  stage: LeadStage;
  deal_value?: number | null;
  last_activity: string;
  notes?: string | null;
  state?: string | null;
  source_campaign?: string | null;
  created_at: string;
  updated_at: string;
}

// ── Approval types ────────────────────────────────────────────
export type ApprovalType = "contact" | "sequence" | "campaign";

export interface ApprovalItem {
  id: string;
  type: ApprovalType;
  reference_id: string;
  title: string;
  description: string;
  submitted_by: string;
  submitted_at: string;
  status: "pending" | "approved" | "rejected";
  reviewed_at?: string | null;
  reviewer_notes?: string | null;
}

// ── Analytics types ───────────────────────────────────────────
export interface CampaignAnalytics {
  open_rate: number;
  reply_rate: number;
  click_rate: number;
  bounce_rate: number;
  total_sent: number;
  total_leads_generated: number;
  cost_per_lead: number;
  total_spend: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  conversion_rate: number;
}

export interface StateBreakdown {
  state: string;
  contacts: number;
  replies: number;
  deals: number;
}

// ── Tab navigation ────────────────────────────────────────────
export type MarketingTab = "contacts" | "sequences" | "approvals" | "campaigns" | "pipeline" | "analytics";
