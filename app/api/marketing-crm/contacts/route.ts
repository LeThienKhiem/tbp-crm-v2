import { NextResponse } from "next/server";
import type { Contact } from "@/types/marketing";
import { listContacts } from "@/services/airtableService";

// ── Mock fallback (used when Airtable is not configured) ─────────
const MOCK_CONTACTS: Contact[] = [
  { id: "c1", first_name: "James", last_name: "Mitchell", email: "j.mitchell@penskefleet.com", phone: "+1-610-555-0142", company: "Penske Truck Leasing", title: "VP Fleet Procurement", industry: "Trucking & Logistics", state: "PA", city: "Reading", linkedin_url: "https://linkedin.com/in/jamesmitchell", source: "apollo_csv", status: "approved", tags: ["fleet", "high-priority"], approved_by: "Thomas", approved_at: "2025-03-01T10:00:00Z", created_at: "2025-02-28T08:00:00Z", updated_at: "2025-03-01T10:00:00Z" },
  { id: "c2", first_name: "Sarah", last_name: "Chen", email: "s.chen@rfrshipping.com", phone: "+1-305-555-0198", company: "Ryder Fleet Management", title: "Director of Parts Sourcing", industry: "Fleet Management", state: "FL", city: "Miami", linkedin_url: null, source: "apollo_csv", status: "approved", tags: ["fleet", "aftermarket"], approved_by: "Thomas", approved_at: "2025-03-02T09:00:00Z", created_at: "2025-02-28T08:30:00Z", updated_at: "2025-03-02T09:00:00Z" },
  { id: "c3", first_name: "Robert", last_name: "Garcia", email: "rgarcia@paccar.com", phone: "+1-425-555-0167", company: "PACCAR Inc.", title: "Sr. Purchasing Manager", industry: "Truck Manufacturing", state: "WA", city: "Bellevue", linkedin_url: "https://linkedin.com/in/robertgarcia", source: "apollo_csv", status: "in_sequence", tags: ["oem", "high-priority"], approved_by: "Thomas", approved_at: "2025-03-03T11:00:00Z", created_at: "2025-03-01T07:00:00Z", updated_at: "2025-03-05T14:00:00Z" },
  { id: "c4", first_name: "Linda", last_name: "Thompson", email: "lthompson@navistar.com", phone: "+1-331-555-0134", company: "Navistar International", title: "Brake Systems Buyer", industry: "Commercial Vehicles", state: "IL", city: "Lisle", linkedin_url: null, source: "apollo_csv", status: "new", tags: ["oem"], approved_by: null, approved_at: null, created_at: "2025-03-05T10:00:00Z", updated_at: "2025-03-05T10:00:00Z" },
  { id: "c5", first_name: "Michael", last_name: "Johnson", email: "mjohnson@rushenterprises.com", phone: "+1-210-555-0188", company: "Rush Enterprises", title: "National Parts Director", industry: "Truck Dealership", state: "TX", city: "San Antonio", linkedin_url: "https://linkedin.com/in/michaeljohnson", source: "apollo_csv", status: "approved", tags: ["aftermarket", "high-priority"], approved_by: "Thomas", approved_at: "2025-03-04T08:00:00Z", created_at: "2025-03-02T09:00:00Z", updated_at: "2025-03-04T08:00:00Z" },
  { id: "c6", first_name: "Patricia", last_name: "Williams", email: "pwilliams@fleetonepride.com", phone: "+1-937-555-0156", company: "FleetPride Inc.", title: "Category Manager - Brakes", industry: "Heavy-Duty Parts Distribution", state: "OH", city: "Dayton", linkedin_url: null, source: "apollo_csv", status: "replied", tags: ["aftermarket", "high-priority"], approved_by: "Thomas", approved_at: "2025-03-01T09:00:00Z", created_at: "2025-02-27T12:00:00Z", updated_at: "2025-03-10T16:00:00Z" },
  { id: "c7", first_name: "David", last_name: "Brown", email: "dbrown@dtna.com", phone: "+1-503-555-0177", company: "Daimler Truck North America", title: "Procurement Specialist", industry: "Truck Manufacturing", state: "OR", city: "Portland", linkedin_url: "https://linkedin.com/in/davidbrown", source: "apollo_csv", status: "new", tags: ["oem"], approved_by: null, approved_at: null, created_at: "2025-03-06T08:00:00Z", updated_at: "2025-03-06T08:00:00Z" },
  { id: "c8", first_name: "Jennifer", last_name: "Davis", email: "jdavis@schneiderfleet.com", phone: "+1-920-555-0123", company: "Schneider National", title: "Fleet Maintenance VP", industry: "Trucking", state: "WI", city: "Green Bay", linkedin_url: null, source: "apollo_csv", status: "approved", tags: ["fleet"], approved_by: "Thomas", approved_at: "2025-03-05T10:00:00Z", created_at: "2025-03-03T11:00:00Z", updated_at: "2025-03-05T10:00:00Z" },
  { id: "c9", first_name: "William", last_name: "Anderson", email: "wanderson@wernerfleet.com", phone: "+1-402-555-0145", company: "Werner Enterprises", title: "Parts Procurement Lead", industry: "Trucking", state: "NE", city: "Omaha", linkedin_url: "https://linkedin.com/in/williamanderson", source: "manual", status: "in_sequence", tags: ["fleet"], approved_by: "Thomas", approved_at: "2025-03-04T09:00:00Z", created_at: "2025-03-02T14:00:00Z", updated_at: "2025-03-06T11:00:00Z" },
  { id: "c10", first_name: "Elizabeth", last_name: "Martinez", email: "emartinez@kennworth.com", phone: "+1-425-555-0191", company: "Kenworth Truck Company", title: "Supply Chain Manager", industry: "Truck Manufacturing", state: "WA", city: "Kirkland", linkedin_url: null, source: "apollo_csv", status: "new", tags: ["oem"], approved_by: null, approved_at: null, created_at: "2025-03-07T07:00:00Z", updated_at: "2025-03-07T07:00:00Z" },
  { id: "c11", first_name: "Richard", last_name: "Taylor", email: "rtaylor@genuineparts.com", phone: "+1-770-555-0139", company: "Genuine Parts Company", title: "Heavy-Duty Division Director", industry: "Parts Distribution", state: "GA", city: "Atlanta", linkedin_url: "https://linkedin.com/in/richardtaylor", source: "apollo_csv", status: "approved", tags: ["aftermarket", "high-priority"], approved_by: "Thomas", approved_at: "2025-03-03T14:00:00Z", created_at: "2025-03-01T10:00:00Z", updated_at: "2025-03-03T14:00:00Z" },
  { id: "c12", first_name: "Barbara", last_name: "Jackson", email: "bjackson@jbhunt.com", phone: "+1-479-555-0168", company: "J.B. Hunt Transport", title: "Equipment Purchasing Manager", industry: "Intermodal Transport", state: "AR", city: "Lowell", linkedin_url: null, source: "apollo_csv", status: "new", tags: ["fleet"], approved_by: null, approved_at: null, created_at: "2025-03-08T09:00:00Z", updated_at: "2025-03-08T09:00:00Z" },
  { id: "c13", first_name: "Charles", last_name: "White", email: "cwhite@volvotrucks.us", phone: "+1-336-555-0182", company: "Volvo Trucks North America", title: "Aftermarket Parts Manager", industry: "Truck Manufacturing", state: "NC", city: "Greensboro", linkedin_url: "https://linkedin.com/in/charleswhite", source: "apollo_csv", status: "in_sequence", tags: ["oem", "aftermarket"], approved_by: "Thomas", approved_at: "2025-03-05T08:00:00Z", created_at: "2025-03-03T07:00:00Z", updated_at: "2025-03-07T15:00:00Z" },
  { id: "c14", first_name: "Susan", last_name: "Harris", email: "sharris@olddominionfreight.com", phone: "+1-757-555-0154", company: "Old Dominion Freight Line", title: "Maintenance Procurement Lead", industry: "LTL Freight", state: "VA", city: "Thomasville", linkedin_url: null, source: "manual", status: "approved", tags: ["fleet"], approved_by: "Thomas", approved_at: "2025-03-06T10:00:00Z", created_at: "2025-03-04T12:00:00Z", updated_at: "2025-03-06T10:00:00Z" },
  { id: "c15", first_name: "Joseph", last_name: "Martin", email: "jmartin@cummins.com", phone: "+1-812-555-0176", company: "Cummins Inc.", title: "Brake Components Sourcing Lead", industry: "Engine & Components", state: "IN", city: "Columbus", linkedin_url: "https://linkedin.com/in/josephmartin", source: "apollo_csv", status: "replied", tags: ["oem", "high-priority"], approved_by: "Thomas", approved_at: "2025-03-02T11:00:00Z", created_at: "2025-02-28T15:00:00Z", updated_at: "2025-03-09T10:00:00Z" },
  { id: "c16", first_name: "Karen", last_name: "Lee", email: "klee@xpo-logistics.com", phone: "+1-203-555-0148", company: "XPO Logistics", title: "Fleet Operations Director", industry: "Logistics", state: "CT", city: "Greenwich", linkedin_url: null, source: "apollo_csv", status: "new", tags: ["fleet"], approved_by: null, approved_at: null, created_at: "2025-03-09T08:00:00Z", updated_at: "2025-03-09T08:00:00Z" },
  { id: "c17", first_name: "Daniel", last_name: "Robinson", email: "drobinson@peterbilt.com", phone: "+1-940-555-0163", company: "Peterbilt Motors", title: "Vendor Relations Manager", industry: "Truck Manufacturing", state: "TX", city: "Denton", linkedin_url: "https://linkedin.com/in/danielrobinson", source: "apollo_csv", status: "approved", tags: ["oem"], approved_by: "Thomas", approved_at: "2025-03-07T09:00:00Z", created_at: "2025-03-05T11:00:00Z", updated_at: "2025-03-07T09:00:00Z" },
  { id: "c18", first_name: "Nancy", last_name: "Clark", email: "nclark@federatedautoparts.com", phone: "+1-276-555-0137", company: "Federated Auto Parts", title: "Heavy-Duty Category Buyer", industry: "Parts Distribution", state: "VA", city: "Staunton", linkedin_url: null, source: "apollo_csv", status: "approved", tags: ["aftermarket"], approved_by: "Thomas", approved_at: "2025-03-06T14:00:00Z", created_at: "2025-03-04T08:00:00Z", updated_at: "2025-03-06T14:00:00Z" },
  { id: "c19", first_name: "Thomas", last_name: "Lewis", email: "tlewis@usxpress.com", phone: "+1-423-555-0195", company: "U.S. Xpress Enterprises", title: "Maintenance Parts Buyer", industry: "Trucking", state: "TN", city: "Chattanooga", linkedin_url: "https://linkedin.com/in/thomaslewis", source: "manual", status: "in_sequence", tags: ["fleet"], approved_by: "Thomas", approved_at: "2025-03-05T12:00:00Z", created_at: "2025-03-03T15:00:00Z", updated_at: "2025-03-08T09:00:00Z" },
  { id: "c20", first_name: "Betty", last_name: "Walker", email: "bwalker@mack-trucks.com", phone: "+1-610-555-0171", company: "Mack Trucks", title: "Aftermarket Sourcing Specialist", industry: "Truck Manufacturing", state: "PA", city: "Greensboro", linkedin_url: null, source: "apollo_csv", status: "new", tags: ["oem", "aftermarket"], approved_by: null, approved_at: null, created_at: "2025-03-10T07:00:00Z", updated_at: "2025-03-10T07:00:00Z" },
  { id: "c21", first_name: "Christopher", last_name: "Hall", email: "chall@siamtruck.com", phone: "+1-313-555-0186", company: "Siam Truck Parts", title: "Import Operations Manager", industry: "Auto Parts Import", state: "MI", city: "Detroit", linkedin_url: "https://linkedin.com/in/christopherhall", source: "linkedin", status: "approved", tags: ["aftermarket", "high-priority"], approved_by: "Thomas", approved_at: "2025-03-08T10:00:00Z", created_at: "2025-03-06T09:00:00Z", updated_at: "2025-03-08T10:00:00Z" },
  { id: "c22", first_name: "Dorothy", last_name: "Allen", email: "dallen@heartlandexpress.com", phone: "+1-319-555-0159", company: "Heartland Express", title: "Procurement Analyst", industry: "Trucking", state: "IA", city: "North Liberty", linkedin_url: null, source: "apollo_csv", status: "new", tags: ["fleet"], approved_by: null, approved_at: null, created_at: "2025-03-11T08:00:00Z", updated_at: "2025-03-11T08:00:00Z" },
  { id: "c23", first_name: "Mark", last_name: "Young", email: "myoung@truckpartsandservice.com", phone: "+1-214-555-0143", company: "Truck Parts & Service Inc.", title: "Owner / Buyer", industry: "Independent Parts Dealer", state: "TX", city: "Dallas", linkedin_url: "https://linkedin.com/in/markyoung", source: "website", status: "replied", tags: ["aftermarket"], approved_by: "Thomas", approved_at: "2025-03-04T15:00:00Z", created_at: "2025-03-02T16:00:00Z", updated_at: "2025-03-11T11:00:00Z" },
  { id: "c24", first_name: "Sandra", last_name: "King", email: "sking@greatdane.com", phone: "+1-912-555-0178", company: "Great Dane Trailers", title: "Components Procurement Manager", industry: "Trailer Manufacturing", state: "GA", city: "Savannah", linkedin_url: null, source: "apollo_csv", status: "approved", tags: ["oem"], approved_by: "Thomas", approved_at: "2025-03-09T09:00:00Z", created_at: "2025-03-07T10:00:00Z", updated_at: "2025-03-09T09:00:00Z" },
  { id: "c25", first_name: "Paul", last_name: "Wright", email: "pwright@midwestwheel.com", phone: "+1-515-555-0164", company: "Midwest Wheel Companies", title: "Brake Products Manager", industry: "Parts Distribution", state: "IA", city: "Des Moines", linkedin_url: "https://linkedin.com/in/paulwright", source: "apollo_csv", status: "in_sequence", tags: ["aftermarket", "high-priority"], approved_by: "Thomas", approved_at: "2025-03-07T11:00:00Z", created_at: "2025-03-05T14:00:00Z", updated_at: "2025-03-09T16:00:00Z" },
];

/** Convert Airtable record → Contact shape (tags from comma-string to array). */
function toContact(r: { id: string; first_name: string; last_name: string; email: string; phone?: string | null; company: string; title: string; industry?: string | null; state?: string | null; city?: string | null; linkedin_url?: string | null; source: string; status: string; tags: string; apollo_id?: string | null; approved_by?: string | null; approved_at?: string | null; created_at: string; updated_at: string }): Contact {
  return {
    id: r.id,
    first_name: r.first_name,
    last_name: r.last_name,
    email: r.email,
    phone: r.phone,
    company: r.company,
    title: r.title,
    industry: r.industry,
    state: r.state,
    city: r.city,
    linkedin_url: r.linkedin_url,
    source: (r.source as Contact["source"]) || "apollo",
    status: (r.status as Contact["status"]) || "new",
    tags: r.tags ? r.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    approved_by: r.approved_by,
    approved_at: r.approved_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function GET() {
  // Try Airtable first; fall back to mock if not configured
  try {
    const airtableRecords = await listContacts();
    const contacts = airtableRecords.map(toContact);
    return NextResponse.json({ data: contacts, source: "airtable" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    // If Airtable is simply not configured, silently fall back to mock
    if (msg.includes("is not set")) {
      return NextResponse.json({ data: MOCK_CONTACTS, source: "mock" });
    }
    console.error("Airtable fetch error:", msg);
    // For other errors (network, auth), also fall back but note the error
    return NextResponse.json({ data: MOCK_CONTACTS, source: "mock", airtable_error: msg });
  }
}

export async function POST() {
  return NextResponse.json({ data: { id: crypto.randomUUID(), status: "created" } });
}
