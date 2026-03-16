/**
 * Apollo.io API service (server-side only).
 * Uses approved endpoints: mixed_people/api_search, people/match, people/show.
 */

const APOLLO_BASE = "https://api.apollo.io/api/v1";

function getApiKey(): string {
  const key = process.env.APOLLO_API_KEY;
  if (!key) throw new Error("APOLLO_API_KEY is not set");
  return key;
}

/** Headers for all Apollo API requests: auth via X-Api-Key (no api_key in body/query). */
function apolloHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Api-Key": getApiKey(),
  };
}

export interface ApolloSearchParams {
  query?: string;
  companyName?: string;
  jobTitle?: string;
  industry?: string;
  location?: string;
  country?: string;
  page?: number;
  perPage?: number;
}

/** Thrown when Apollo API returns 4xx/5xx; route can use statusCode and message. */
export class ApolloApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApolloApiError";
  }
}

export interface ApolloPersonSummary {
  id: string;
  name: string;
  title?: string | null;
  headline?: string | null;
  organization_name?: string | null;
  organization_id?: string | null;
  linkedin_url?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  seniority?: string | null;
  department?: string | null;
  industry?: string | null;
  estimated_annual_revenue?: string | null;
  employee_count?: string | null;
  technologies?: string[] | null;
  buying_intent?: string | null;
}

export interface ApolloOrganizationInfo {
  id: string;
  name?: string | null;
  industry?: string | null;
  estimated_annual_revenue?: string | null;
  employee_count?: string | null;
}

export interface ApolloSearchResult {
  people: ApolloPersonSummary[];
  totalEntries?: number;
  pagination?: { page: number; per_page: number; total_entries: number };
}

function str(v: unknown): string | null {
  if (v == null) return null;
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function arrStr(v: unknown): string[] | null {
  if (v == null || !Array.isArray(v)) return null;
  return v.map((x) => String(x)).filter(Boolean);
}

/** Safe get for nested object (e.g. p.organization). Returns null if not a plain object. */
function safeObj(v: unknown): Record<string, unknown> | null {
  if (v == null || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

/** First non-null string from one or more values (person then org fallback). */
function firstStr(...values: unknown[]): string | null {
  for (const v of values) {
    const s = str(v);
    if (s != null) return s;
  }
  return null;
}

/** First element of an array as string, or null. For Apollo fields like departments (array). */
function firstArrEl(v: unknown): string | null {
  if (v == null || !Array.isArray(v)) return null;
  const first = v[0];
  return str(first);
}

/**
 * Fetch organization by id via api/v1/organizations/show. Fills industry, revenue, employee_count.
 */
export async function getOrganization(organizationId: string): Promise<ApolloOrganizationInfo> {
  const res = await fetch(
    `${APOLLO_BASE}/organizations/show?id=${encodeURIComponent(organizationId)}`,
    { method: "GET", headers: apolloHeaders() }
  );
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) throw new Error("Apollo API key invalid or expired");
    throw new Error(`Apollo organization fetch failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const raw = (await res.json()) as { organization?: Record<string, unknown> };
  const org = safeObj(raw?.organization ?? raw);
  return {
    id: organizationId,
    name: org ? firstStr(org.name) ?? null : null,
    industry: org ? firstStr(org.industry) ?? null : null,
    estimated_annual_revenue: org ? firstStr(org.estimated_annual_revenue, org.annual_revenue) ?? null : null,
    employee_count: org ? firstStr(org.employee_count, org.estimated_num_employees) ?? null : null,
  };
}

/**
 * Search leads via mixed_people/api_search.
 * Payload matches Apollo v1: strings for q_keywords/q_organization_name, arrays for person_titles, organization_industries, person_locations.
 * Only add a key when the user provided a value (no empty arrays or empty strings).
 */
export async function apiSearch(params: ApolloSearchParams): Promise<ApolloSearchResult> {
  const payload: Record<string, unknown> = {};
  const keywords = params.query?.trim();
  if (keywords) payload.q_keywords = keywords;
  const companyName = params.companyName?.trim();
  if (companyName) payload.q_organization_name = companyName;
  const jobTitle = params.jobTitle?.trim();
  if (jobTitle) payload.person_titles = [jobTitle];
  const industry = params.industry?.trim();
  if (industry) payload.organization_industries = [industry];
  const location = params.location?.trim();
  const country = params.country?.trim() || "United States";
  const personLocations = location ? [location, country] : [country];
  payload.person_locations = personLocations;
  payload.page = params.page ?? 1;
  payload.per_page = Math.min(params.perPage ?? 25, 25);

  console.log("FINAL PAYLOAD:", payload);

  const res = await fetch(`${APOLLO_BASE}/mixed_people/api_search`, {
    method: "POST",
    headers: apolloHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    let apolloMessage: string;
    try {
      const json = JSON.parse(text) as { error?: string; errors?: Array<{ message?: string }> };
      apolloMessage =
        typeof json?.error === "string"
          ? json.error
          : Array.isArray(json?.errors) && json.errors[0]?.message
            ? String(json.errors[0].message)
            : text.slice(0, 300) || `HTTP ${res.status}`;
    } catch {
      apolloMessage = text.slice(0, 300) || `HTTP ${res.status}`;
    }
    if (res.status === 401) throw new ApolloApiError(401, "Apollo API key invalid or expired");
    throw new ApolloApiError(res.status, apolloMessage.slice(0, 500));
  }

  const data = (await res.json()) as {
    people?: Array<Record<string, unknown> & { person?: unknown; contact?: unknown; organization?: unknown }>;
    pagination?: { page: number; per_page: number; total_entries: number };
  };

  console.log("RAW APOLLO:", data);

  const people: ApolloPersonSummary[] = (data.people ?? []).map((p) => {
    const root = safeObj(p) ?? {};
    const personSub = safeObj(p?.person);
    const contactSub = safeObj(p?.contact);
    const person = personSub ?? root;
    const org = safeObj(person.organization ?? root.organization);

    const firstName = firstStr(person.first_name, root.first_name);
    const lastName = firstStr(person.last_name, root.last_name);
    const name =
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      firstStr(person.name, root.name) ||
      "Unknown";

    const techPerson = arrStr(person.technologies);
    const techOrg = org ? arrStr(org.technologies ?? org.technology_names) : null;
    const technologies = (techPerson ?? techOrg)?.length ? (techPerson ?? techOrg) : null;

    const revenuePerson = firstStr(person.estimated_annual_revenue, person.annual_revenue);
    const revenueOrg = org ? firstStr(org.estimated_annual_revenue, org.annual_revenue) : null;
    const estimated_annual_revenue = revenuePerson ?? revenueOrg ?? null;

    const empPerson = firstStr(person.employee_count);
    const empOrg = org ? firstStr(org.employee_count, org.estimated_num_employees) : null;
    const employee_count = empPerson ?? empOrg ?? null;

    const seniority = str(person.seniority) ?? str(root.seniority) ?? null;
    const department = firstStr(person.department) ?? firstArrEl(person.departments) ?? null;
    const industry = (org ? str(org.industry) : null) ?? firstStr(person.organization_industry, person.industry, root.industry) ?? null;
    const linkedinUrl =
      str(person.linkedin_url) ?? str(person.linkedin) ?? str(contactSub?.linkedin_url) ?? str(contactSub?.linkedin) ?? str(root.linkedin_url) ?? str(root.linkedin) ?? null;

    const organizationId = firstStr(person.organization_id, root.organization_id, org?.id) ?? null;

    return {
      id: str(person.id) ?? str(root.id) ?? "",
      name,
      title: firstStr(person.title, root.title) ?? null,
      headline: firstStr(person.headline) ?? null,
      organization_name: firstStr(person.organization_name, org?.name, root.organization_name) ?? null,
      organization_id: organizationId,
      linkedin_url: linkedinUrl,
      city: firstStr(person.city, root.city) ?? null,
      state: firstStr(person.state, root.state) ?? null,
      country: firstStr(person.country, root.country) ?? null,
      seniority,
      department,
      industry,
      estimated_annual_revenue,
      employee_count,
      technologies,
      buying_intent: firstStr(person.buying_intent, org?.buying_intent) ?? null,
    };
  });

  const orgIdsToFetch = [...new Set(people.map((x) => x.organization_id).filter(Boolean))] as string[];
  const orgMap: Record<string, ApolloOrganizationInfo> = {};
  for (const id of orgIdsToFetch) {
    try {
      orgMap[id] = await getOrganization(id);
    } catch {
      orgMap[id] = { id };
    }
  }
  const enriched = people.map((row) => {
    const orgId = row.organization_id;
    if (!orgId || !orgMap[orgId]) return row;
    const org = orgMap[orgId];
    return {
      ...row,
      industry: row.industry ?? org.industry ?? null,
      estimated_annual_revenue: row.estimated_annual_revenue ?? org.estimated_annual_revenue ?? null,
      employee_count: row.employee_count ?? org.employee_count ?? null,
    };
  });

  return {
    people: enriched,
    totalEntries: data.pagination?.total_entries,
    pagination: data.pagination,
  };
}

export interface ApolloContactReveal {
  id: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  direct_dial?: string | null;
  title?: string | null;
  organization_name?: string | null;
  linkedin_url?: string | null;
  seniority?: string | null;
  industry?: string | null;
  estimated_annual_revenue?: string | null;
  employee_count?: string | null;
}

function strReveal(v: unknown): string | null {
  if (v == null || typeof v !== "string") return null;
  const s = v.trim();
  return s === "" ? null : s;
}

/** Parse full person + organization from Apollo people/match response for Smart Reveal. */
function parsePersonResponse(data: unknown, personId: string): ApolloContactReveal {
  if (data == null || typeof data !== "object") {
    return {
      id: personId,
      name: null,
      email: null,
      phone: null,
      direct_dial: null,
      title: null,
      organization_name: null,
      linkedin_url: null,
      seniority: null,
      industry: null,
      estimated_annual_revenue: null,
      employee_count: null,
    };
  }
  const p = data as Record<string, unknown>;
  const person = (p.person != null && typeof p.person === "object" ? p.person : p) as Record<string, unknown>;
  const org = safeObj(person.organization);
  const firstName = strReveal(person.first_name);
  const lastName = strReveal(person.last_name);
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || strReveal(person.name) || null;
  return {
    id: strReveal(person.id) ?? personId,
    name: fullName,
    first_name: firstName,
    last_name: lastName,
    email: strReveal(person.email) ?? null,
    phone: strReveal(person.sanitized_phone) ?? strReveal(person.phone) ?? null,
    direct_dial: strReveal(person.direct_dial) ?? strReveal(person.mobile_phone) ?? null,
    title: strReveal(person.title) ?? null,
    organization_name: strReveal(person.organization_name) ?? null,
    linkedin_url: strReveal(person.linkedin_url) ?? strReveal(person.linkedin) ?? null,
    seniority: strReveal(person.seniority) ?? null,
    industry: strReveal(person.industry) ?? (org ? strReveal(org.industry) : null) ?? null,
    estimated_annual_revenue: strReveal(person.estimated_annual_revenue) ?? strReveal(person.annual_revenue) ?? (org ? strReveal(org.estimated_annual_revenue) ?? strReveal(org.annual_revenue) : null) ?? null,
    employee_count: strReveal(person.employee_count) ?? (org ? strReveal(org.employee_count) ?? strReveal(org.estimated_num_employees) : null) ?? null,
  };
}

/**
 * Reveal contact (email/phone) via people/match with person_id from search. Uses 1 credit.
 * POST api/v1/people/match — preferred for leads from search (person_id in body).
 */
export async function revealContact(personId: string): Promise<ApolloContactReveal> {
  const res = await fetch(`${APOLLO_BASE}/people/match`, {
    method: "POST",
    headers: apolloHeaders(),
    body: JSON.stringify({ person_id: personId }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) throw new Error("Apollo API key invalid or expired");
    if (res.status === 404) throw new Error("Contact not found");
    throw new Error(`Apollo reveal failed: ${res.status} ${text.slice(0, 200)}`);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("Apollo reveal failed: invalid JSON response");
  }
  return parsePersonResponse(data, personId);
}

/**
 * Reveal contact via people/show (GET with id in path). Uses 1 credit.
 * Use when you have the Apollo person id from search: GET api/v1/people/{person_id}.
 */
export async function revealContactShow(personId: string): Promise<ApolloContactReveal> {
  const res = await fetch(`${APOLLO_BASE}/people/${encodeURIComponent(personId)}`, {
    method: "GET",
    headers: apolloHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) throw new Error("Apollo API key invalid or expired");
    if (res.status === 404) throw new Error("Contact not found");
    throw new Error(`Apollo reveal failed: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return parsePersonResponse(data, personId);
}
