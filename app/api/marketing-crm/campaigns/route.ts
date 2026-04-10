import { NextResponse } from "next/server";
import type { Campaign } from "@/types/marketing";

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: "camp1",
    name: "Q1 Fleet Manager Outreach",
    sequence_id: "seq1",
    sequence_name: "Cold Outreach — Fleet Managers",
    platform: "instantly",
    status: "active",
    contact_count: 120,
    stats: { total_sent: 340, delivered: 328, opened: 189, replied: 41, clicked: 67, bounced: 12, unsubscribed: 3 },
    send_from: "thomas@outreach.tbpauto.com",
    started_at: "2025-03-01T08:00:00Z",
    completed_at: null,
    created_at: "2025-02-28T10:00:00Z",
    updated_at: "2025-03-12T16:00:00Z",
  },
  {
    id: "camp2",
    name: "HDAW Trade Show Follow-up",
    sequence_id: "seq2",
    sequence_name: "Follow-up — Trade Show Leads",
    platform: "lemlist",
    status: "completed",
    contact_count: 45,
    stats: { total_sent: 90, delivered: 88, opened: 58, replied: 14, clicked: 22, bounced: 2, unsubscribed: 1 },
    send_from: "thomas@outreach.tbpauto.com",
    started_at: "2025-03-05T08:00:00Z",
    completed_at: "2025-03-15T18:00:00Z",
    created_at: "2025-03-04T14:00:00Z",
    updated_at: "2025-03-15T18:00:00Z",
  },
  {
    id: "camp3",
    name: "OEM Purchasing Managers — Wave 1",
    sequence_id: "seq1",
    sequence_name: "Cold Outreach — Fleet Managers",
    platform: "instantly",
    status: "sending",
    contact_count: 85,
    stats: { total_sent: 85, delivered: 82, opened: 34, replied: 5, clicked: 11, bounced: 3, unsubscribed: 0 },
    send_from: "sales@outreach.tbpauto.com",
    started_at: "2025-03-11T08:00:00Z",
    completed_at: null,
    created_at: "2025-03-10T09:00:00Z",
    updated_at: "2025-03-12T10:00:00Z",
  },
  {
    id: "camp4",
    name: "Aftermarket Distributors Q2",
    sequence_id: "seq3",
    sequence_name: "Re-engagement — Dormant Contacts",
    platform: "lemlist",
    status: "draft",
    contact_count: 60,
    stats: { total_sent: 0, delivered: 0, opened: 0, replied: 0, clicked: 0, bounced: 0, unsubscribed: 0 },
    send_from: "thomas@outreach.tbpauto.com",
    started_at: null,
    completed_at: null,
    created_at: "2025-03-12T11:00:00Z",
    updated_at: "2025-03-12T11:00:00Z",
  },
];

export async function GET() {
  return NextResponse.json({ data: MOCK_CAMPAIGNS });
}

export async function POST() {
  return NextResponse.json({ data: { id: crypto.randomUUID(), status: "created" } });
}
