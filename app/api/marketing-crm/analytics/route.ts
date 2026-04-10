import { NextResponse } from "next/server";

const MOCK_ANALYTICS = {
  summary: {
    total_sent: 2515,
    open_rate: 52.4,
    reply_rate: 11.8,
    click_rate: 4.2,
    bounce_rate: 3.1,
    total_leads_generated: 68,
    cost_per_lead: 18.5,
    total_spend: 1258,
  },
  funnel: [
    { stage: "Contacted", count: 2515, conversion_rate: 100 },
    { stage: "Opened", count: 1318, conversion_rate: 52.4 },
    { stage: "Replied", count: 297, conversion_rate: 11.8 },
    { stage: "Meeting", count: 84, conversion_rate: 3.3 },
    { stage: "SQL", count: 42, conversion_rate: 1.7 },
    { stage: "Deal", count: 18, conversion_rate: 0.7 },
  ],
  state_breakdown: [
    { state: "TX", contacts: 385, replies: 52, deals: 4 },
    { state: "CA", contacts: 342, replies: 38, deals: 3 },
    { state: "OH", contacts: 278, replies: 35, deals: 2 },
    { state: "IN", contacts: 245, replies: 31, deals: 2 },
    { state: "MI", contacts: 218, replies: 28, deals: 2 },
    { state: "PA", contacts: 198, replies: 24, deals: 1 },
    { state: "IL", contacts: 185, replies: 22, deals: 1 },
    { state: "GA", contacts: 164, replies: 18, deals: 1 },
    { state: "TN", contacts: 142, replies: 16, deals: 1 },
    { state: "NC", contacts: 128, replies: 14, deals: 1 },
    { state: "WI", contacts: 115, replies: 10, deals: 0 },
    { state: "FL", contacts: 115, replies: 9, deals: 0 },
  ],
  campaign_comparison: [
    { name: "Q1 Fleet Outreach", open_rate: 55.7, reply_rate: 12.1, click_rate: 19.7 },
    { name: "HDAW Follow-up", open_rate: 65.9, reply_rate: 15.9, click_rate: 25.0 },
    { name: "OEM Wave 1", open_rate: 41.5, reply_rate: 6.1, click_rate: 13.4 },
    { name: "Aftermarket Q2", open_rate: 0, reply_rate: 0, click_rate: 0 },
  ],
};

export async function GET() {
  return NextResponse.json({ data: MOCK_ANALYTICS });
}
