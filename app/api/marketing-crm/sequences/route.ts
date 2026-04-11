import { NextResponse } from "next/server";
import type { Sequence } from "@/types/marketing";

const MOCK_SEQUENCES: Sequence[] = [
  {
    id: "seq1",
    name: "Cold Outreach — Fleet Managers",
    description: "Initial cold outreach sequence targeting fleet managers and maintenance directors at major US trucking companies.",
    sequence_type: "cold_instantly",
    target_segments: ["distributors"],
    target_states: ["TX", "CA", "OH", "PA", "IL"],
    estimated_contacts: 120,
    steps: [
      { id: "s1a", order: 1, type: "email", subject: "TBP Auto — Premium Brake Drums for US Fleets", body: "Hi {{first_name}},\n\nI noticed {{company}} operates a significant fleet across the US. At TBP Auto, we manufacture premium brake drums that meet FMVSS 121 standards at competitive pricing.\n\nWould you be open to a quick call this week to discuss your brake drum sourcing?\n\nBest,\nThomas Nguyen\nTBP Auto" },
      { id: "s1b", order: 2, type: "wait", wait_days: 3 },
      { id: "s1c", order: 3, type: "email", subject: "Re: TBP Auto — Premium Brake Drums for US Fleets", body: "Hi {{first_name}},\n\nJust following up on my previous email. We currently supply brake drums to several major US fleet operators with 99.2% on-time delivery.\n\nI'd love to share our catalog and pricing. Would 15 minutes work this week?\n\nBest,\nThomas" },
      { id: "s1d", order: 4, type: "wait", wait_days: 4 },
      { id: "s1e", order: 5, type: "email", subject: "Quick question about {{company}}'s brake drum sourcing", body: "Hi {{first_name}},\n\nOne last reach-out — we have a special introductory offer for new fleet customers: free sample shipment + 10% off first order.\n\nIf now isn't the right time, no worries. But if you're evaluating brake drum suppliers, I'd welcome the chance to earn your business.\n\nBest,\nThomas" },
    ],
    status: "active",
    send_from_domain: "outreach.tbpauto.com",
    created_by: "Khiem",
    approved_by: "Thomas",
    approved_at: "2025-03-01T10:00:00Z",
    created_at: "2025-02-25T08:00:00Z",
    updated_at: "2025-03-01T10:00:00Z",
  },
  {
    id: "seq2",
    name: "Follow-up — Trade Show Leads",
    description: "Follow-up sequence for contacts met at HDAW and AAPEX trade shows.",
    sequence_type: "priority_instantly",
    target_segments: ["top_50_priority"],
    target_states: ["TN", "GA", "NC", "KY"],
    estimated_contacts: 45,
    steps: [
      { id: "s2a", order: 1, type: "email", subject: "Great meeting you at HDAW, {{first_name}}", body: "Hi {{first_name}},\n\nIt was great connecting at HDAW last week. As discussed, TBP Auto manufactures high-quality brake drums with direct US shipping from our Vietnam facility.\n\nI've attached our latest catalog. Would you like to schedule a follow-up call?\n\nBest,\nThomas" },
      { id: "s2b", order: 2, type: "wait", wait_days: 5 },
      { id: "s2c", order: 3, type: "email", subject: "Re: HDAW follow-up — TBP Auto brake drum samples", body: "Hi {{first_name}},\n\nJust checking in after our conversation at the show. We can ship a sample set to {{company}} for evaluation at no cost.\n\nShall I arrange that?\n\nBest,\nThomas" },
    ],
    status: "approved",
    send_from_domain: "outreach.tbpauto.com",
    created_by: "Khiem",
    approved_by: "Thomas",
    approved_at: "2025-03-05T14:00:00Z",
    created_at: "2025-03-03T09:00:00Z",
    updated_at: "2025-03-05T14:00:00Z",
  },
  {
    id: "seq3",
    name: "Re-engagement — Dormant Contacts",
    description: "Re-engage contacts who haven't responded in 30+ days with fresh value propositions.",
    sequence_type: "nurture_instantly",
    target_segments: ["distributors", "private_label"],
    target_states: ["TX", "GA", "NC", "IN", "MI"],
    estimated_contacts: 78,
    steps: [
      { id: "s3a", order: 1, type: "email", subject: "New: TBP Auto 2025 product line + US warehouse update", body: "Hi {{first_name}},\n\nHope you're doing well. Wanted to share some exciting news — TBP Auto has expanded our 2025 brake drum line and now offers local US warehouse fulfillment for faster delivery.\n\nWould this change the equation for {{company}}?\n\nBest,\nThomas" },
      { id: "s3b", order: 2, type: "wait", wait_days: 7 },
      { id: "s3c", order: 3, type: "condition", condition: "opened_previous" },
      { id: "s3d", order: 4, type: "email", subject: "Special pricing for {{company}} — limited time", body: "Hi {{first_name}},\n\nSince you showed interest, I wanted to extend a special Q2 pricing offer for {{company}}: 15% off your first container order + free ocean freight.\n\nThis is available through end of Q2. Let me know if you'd like details.\n\nBest,\nThomas" },
    ],
    status: "draft",
    send_from_domain: "outreach.tbpauto.com",
    created_by: "Khiem",
    approved_by: null,
    approved_at: null,
    created_at: "2025-03-10T11:00:00Z",
    updated_at: "2025-03-10T11:00:00Z",
  },
];

export async function GET() {
  return NextResponse.json({ data: MOCK_SEQUENCES });
}

export async function POST() {
  return NextResponse.json({ data: { id: crypto.randomUUID(), status: "created" } });
}
