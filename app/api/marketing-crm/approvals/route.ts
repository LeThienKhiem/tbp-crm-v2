import { NextResponse } from "next/server";
import type { ApprovalItem } from "@/types/marketing";

const MOCK_APPROVALS: ApprovalItem[] = [
  { id: "apr1", type: "contact", reference_id: "c4", title: "Linda Thompson — Navistar International", description: "New contact from Apollo CSV import. Brake Systems Buyer at Navistar.", submitted_by: "Khiem", submitted_at: "2025-03-05T10:30:00Z", status: "pending", reviewed_at: null, reviewer_notes: null },
  { id: "apr2", type: "contact", reference_id: "c7", title: "David Brown — Daimler Truck NA", description: "New contact from Apollo CSV import. Procurement Specialist at DTNA.", submitted_by: "Khiem", submitted_at: "2025-03-06T08:15:00Z", status: "pending", reviewed_at: null, reviewer_notes: null },
  { id: "apr3", type: "contact", reference_id: "c10", title: "Elizabeth Martinez — Kenworth", description: "New contact from Apollo CSV import. Supply Chain Manager.", submitted_by: "Khiem", submitted_at: "2025-03-07T07:30:00Z", status: "pending", reviewed_at: null, reviewer_notes: null },
  { id: "apr4", type: "contact", reference_id: "c16", title: "Karen Lee — XPO Logistics", description: "New contact from Apollo CSV import. Fleet Operations Director.", submitted_by: "Khiem", submitted_at: "2025-03-09T08:45:00Z", status: "pending", reviewed_at: null, reviewer_notes: null },
  { id: "apr5", type: "sequence", reference_id: "seq3", title: "Re-engagement — Dormant Contacts", description: "4-step re-engagement sequence with conditional logic. Uses special Q2 pricing offer.", submitted_by: "Khiem", submitted_at: "2025-03-10T11:30:00Z", status: "pending", reviewed_at: null, reviewer_notes: null },
  { id: "apr6", type: "sequence", reference_id: "seq_new", title: "OEM Decision Maker Outreach", description: "New 3-step sequence targeting OEM purchasing managers with factory tour invitation.", submitted_by: "Khiem", submitted_at: "2025-03-11T09:00:00Z", status: "pending", reviewed_at: null, reviewer_notes: null },
  { id: "apr7", type: "campaign", reference_id: "camp_new1", title: "Q2 Fleet Manager Blitz — Instantly.ai", description: "Campaign targeting 150 fleet managers via Instantly.ai using the Cold Outreach sequence.", submitted_by: "Khiem", submitted_at: "2025-03-11T14:00:00Z", status: "pending", reviewed_at: null, reviewer_notes: null },
  { id: "apr8", type: "campaign", reference_id: "camp_new2", title: "Trade Show Follow-up — Lemlist", description: "Campaign for 45 HDAW contacts via Lemlist using the Trade Show Follow-up sequence.", submitted_by: "Khiem", submitted_at: "2025-03-12T08:00:00Z", status: "pending", reviewed_at: null, reviewer_notes: null },
];

export async function GET() {
  return NextResponse.json({ data: MOCK_APPROVALS });
}

export async function PATCH() {
  return NextResponse.json({ data: { status: "updated" } });
}
