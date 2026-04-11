import { NextResponse } from "next/server";
import type { ApprovalItem } from "@/types/marketing";

const MOCK_APPROVALS: ApprovalItem[] = [
  { id: "apr1", type: "contact", reference_id: "c4", title: "Linda Thompson — Navistar International", description: "New contact from Apollo CSV import. Brake Systems Buyer at Navistar.", submitted_by: "Khiem", submitted_at: "2025-03-05T10:30:00Z", status: "pending", reviewed_at: null, reviewer_notes: null },
  { id: "apr2", type: "contact", reference_id: "c7", title: "David Brown — Daimler Truck NA", description: "New contact from Apollo CSV import. Procurement Specialist at DTNA.", submitted_by: "Khiem", submitted_at: "2025-03-06T08:15:00Z", status: "pending", reviewed_at: null, reviewer_notes: null },
  { id: "apr3", type: "contact", reference_id: "c10", title: "Elizabeth Martinez — Kenworth", description: "New contact from Apollo CSV import. Supply Chain Manager.", submitted_by: "Khiem", submitted_at: "2025-03-07T07:30:00Z", status: "pending", reviewed_at: null, reviewer_notes: null },
  { id: "apr4", type: "contact", reference_id: "c16", title: "Karen Lee — XPO Logistics", description: "New contact from Apollo CSV import. Fleet Operations Director.", submitted_by: "Khiem", submitted_at: "2025-03-09T08:45:00Z", status: "pending", reviewed_at: null, reviewer_notes: null },
  {
    id: "apr5", type: "sequence", reference_id: "seq3",
    title: "Re-engagement — Dormant Contacts",
    description: "4-step nurture sequence via Instantly.ai targeting Distributors + Private Label in TX, GA, NC, IN, MI. ~78 contacts.",
    submitted_by: "Khiem", submitted_at: "2025-03-10T11:30:00Z", status: "pending", reviewed_at: null, reviewer_notes: null,
    sequence_detail: {
      sequence_type: "nurture_instantly",
      target_segments: ["distributors", "private_label"],
      target_states: ["TX", "GA", "NC", "IN", "MI"],
      estimated_contacts: 78,
      send_from_domain: "outreach.tbpauto.com",
      steps: [
        { type: "email", subject: "New: TBP Auto 2025 product line + US warehouse update", body: "Hi {{first_name}},\n\nHope you're doing well. Wanted to share some exciting news — TBP Auto has expanded our 2025 brake drum line..." },
        { type: "wait", wait_days: 7 },
        { type: "condition", condition: "opened_previous" },
        { type: "email", subject: "Special pricing for {{company}} — limited time", body: "Hi {{first_name}},\n\nSince you showed interest, I wanted to extend a special Q2 pricing offer..." },
      ],
    },
  },
  {
    id: "apr6", type: "sequence", reference_id: "seq_new",
    title: "OEM Decision Maker Outreach",
    description: "3-step cold outreach via Instantly.ai targeting Top 50 Priority OEM contacts in WA, OR, NC, PA. ~52 contacts.",
    submitted_by: "Khiem", submitted_at: "2025-03-11T09:00:00Z", status: "pending", reviewed_at: null, reviewer_notes: null,
    sequence_detail: {
      sequence_type: "cold_instantly",
      target_segments: ["top_50_priority"],
      target_states: ["WA", "OR", "NC", "PA"],
      estimated_contacts: 52,
      send_from_domain: "outreach.tbpauto.com",
      steps: [
        { type: "email", subject: "TBP Auto — Factory tour invitation for {{company}}", body: "Hi {{first_name}},\n\nWe'd like to invite {{company}} to a virtual factory tour of our brake drum manufacturing facility..." },
        { type: "wait", wait_days: 4 },
        { type: "email", subject: "Re: Factory tour — OEM partnership opportunity", body: "Hi {{first_name}},\n\nFollowing up on the factory tour invite. We currently supply OEM-grade brake drums to several North American manufacturers..." },
      ],
    },
  },
  { id: "apr7", type: "campaign", reference_id: "camp_new1", title: "Q2 Fleet Manager Blitz — Instantly.ai", description: "Campaign targeting 150 fleet managers via Instantly.ai using the Cold Outreach sequence.", submitted_by: "Khiem", submitted_at: "2025-03-11T14:00:00Z", status: "pending", reviewed_at: null, reviewer_notes: null },
  { id: "apr8", type: "campaign", reference_id: "camp_new2", title: "Trade Show Follow-up — Instantly.ai", description: "Campaign for 45 HDAW contacts via Instantly.ai using the Trade Show Follow-up sequence.", submitted_by: "Khiem", submitted_at: "2025-03-12T08:00:00Z", status: "pending", reviewed_at: null, reviewer_notes: null },
];

export async function GET() {
  return NextResponse.json({ data: MOCK_APPROVALS });
}

export async function PATCH() {
  return NextResponse.json({ data: { status: "updated" } });
}
