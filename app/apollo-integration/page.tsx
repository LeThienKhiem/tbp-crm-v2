"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import {
  ArrowLeft,
  Search,
  User,
  Mail,
  Phone,
  Loader2,
  AlertCircle,
  ExternalLink,
  X,
  Building2,
  MapPin,
  Briefcase,
  Target,
  Cpu,
} from "lucide-react";

/** Display value: use dash for null/empty. */
const d = (v: string | null | undefined): string => (v?.trim() ? v.trim() : "—");

type LeadRow = {
  id: string;
  name: string;
  title?: string | null;
  headline?: string | null;
  organization_name?: string | null;
  linkedin_url?: string | null;
  seniority?: string | null;
  department?: string | null;
  industry?: string | null;
  estimated_annual_revenue?: string | null;
  employee_count?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  technologies?: string[] | null;
  buying_intent?: string | null;
};

type RevealedContact = {
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
};

export default function ApolloIntegrationPage() {
  const [query, setQuery] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState("United States");
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [revealModal, setRevealModal] = useState<LeadRow | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [revealedMap, setRevealedMap] = useState<Record<string, RevealedContact>>({});
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [detailLead, setDetailLead] = useState<LeadRow | null>(null);

  const showToast = useCallback((message: string, type: "error" | "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const PAGE_SIZE = 20;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    setSearchLoading(true);
    setLeads([]);
    setDetailLead(null);
    setPage(1);
    setHasMore(false);
    try {
      const res = await fetch("/api/apollo/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim() || undefined,
          companyName: companyName.trim() || undefined,
          jobTitle: jobTitle.trim() || undefined,
          industry: industry.trim() || undefined,
          location: location.trim() || undefined,
          country: country || "United States",
          page: 1,
          perPage: PAGE_SIZE,
        }),
      });
      const json = await res.json();
      if (json.error) {
        setSearchError(json.error);
        if (res.status === 401) showToast("Apollo API key invalid or expired.", "error");
        return;
      }
      const people = json.data?.people ?? [];
      setLeads(people);
      const pagination = json.data?.pagination;
      const totalEntries = pagination?.total_entries ?? json.data?.totalEntries;
      const perPage = pagination?.per_page ?? PAGE_SIZE;
      const totalPages = totalEntries != null ? Math.ceil(totalEntries / perPage) : null;
      setHasMore(
        totalPages != null ? 1 < totalPages : people.length === PAGE_SIZE
      );
    } catch {
      setSearchError("Search request failed.");
      showToast("Search request failed.", "error");
    } finally {
      setSearchLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadMoreLoading || !hasMore) return;
    setLoadMoreLoading(true);
    const nextPage = page + 1;
    try {
      const res = await fetch("/api/apollo/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim() || undefined,
          companyName: companyName.trim() || undefined,
          jobTitle: jobTitle.trim() || undefined,
          industry: industry.trim() || undefined,
          location: location.trim() || undefined,
          country: country || "United States",
          page: nextPage,
          perPage: PAGE_SIZE,
        }),
      });
      const json = await res.json();
      if (json.error) {
        setSearchError(json.error);
        setLoadMoreLoading(false);
        return;
      }
      const people = json.data?.people ?? [];
      setLeads((prev) => [...prev, ...people]);
      setPage(nextPage);
      const pagination = json.data?.pagination;
      const totalEntries = pagination?.total_entries ?? json.data?.totalEntries;
      const perPage = pagination?.per_page ?? PAGE_SIZE;
      const totalPages = totalEntries != null ? Math.ceil(totalEntries / perPage) : null;
      setHasMore(
        totalPages != null ? nextPage < totalPages : people.length === PAGE_SIZE
      );
    } catch {
      setSearchError("Failed to load more results.");
      showToast("Failed to load more results.", "error");
    } finally {
      setLoadMoreLoading(false);
    }
  };

  const openRevealModal = (lead: LeadRow) => setRevealModal(lead);
  const closeRevealModal = () => {
    if (!revealLoading) setRevealModal(null);
  };

  const confirmReveal = async () => {
    if (!revealModal) return;
    const rowId = revealModal.id;
    setRevealLoading(true);
    try {
      const res = await fetch("/api/apollo/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: rowId }),
      });
      const json = await res.json();
      if (json.error) {
        showToast(res.status === 404 ? "Contact not found." : json.error, "error");
        closeRevealModal();
        return;
      }
      const data = json.data as RevealedContact;
      const revealedFullName =
        [data.first_name, data.last_name].filter(Boolean).join(" ").trim() || data.name || null;
      setRevealedMap((prev) => ({ ...prev, [rowId]: data }));
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === rowId
            ? {
                ...lead,
                name: revealedFullName ?? lead.name,
                linkedin_url: data.linkedin_url ?? lead.linkedin_url,
                seniority: data.seniority ?? lead.seniority,
                industry: data.industry ?? lead.industry,
                estimated_annual_revenue: data.estimated_annual_revenue ?? lead.estimated_annual_revenue,
                employee_count: data.employee_count ?? lead.employee_count,
              }
            : lead
        )
      );
      setDetailLead((prev) =>
        prev?.id === rowId && revealedFullName
          ? { ...prev, name: revealedFullName }
          : prev
      );
      showToast("Contact revealed.", "success");
      closeRevealModal();
    } catch {
      showToast("Reveal request failed.", "error");
      closeRevealModal();
    } finally {
      setRevealLoading(false);
    }
  };

  const locationStr = (lead: LeadRow) =>
    [lead.city, lead.state, lead.country].filter(Boolean).join(", ") || "—";

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Portal
          </Link>
        </div>

        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Apollo.io Intelligence Center
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Lead search and contact reveal. One credit per reveal — no bulk actions.
          </p>
        </header>

        {/* Search card */}
        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Search className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Lead Search</h2>
          </div>
          <p className="mb-5 text-sm text-slate-500">
            Search by keywords, company name, job title, industry, and location. Leave fields blank to omit them.
          </p>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="search-query" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Search (keywords)
                </label>
                <input
                  id="search-query"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. VP Sales, logistics"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="filter-company" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Company Name
                </label>
                <input
                  id="filter-company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="filter-title" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Job Title
                </label>
                <input
                  id="filter-title"
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Director"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="filter-industry" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Company Industry
                </label>
                <input
                  id="filter-industry"
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Manufacturing"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="filter-location" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Location
                </label>
                <input
                  id="filter-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. New York"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="filter-country" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Country
                </label>
                <select
                  id="filter-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="United States">United States</option>
                  <option value="Canada">Canada</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Australia">Australia</option>
                  <option value="Vietnam">Vietnam</option>
                  <option value="India">India</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={searchLoading}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
            >
              {searchLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching…
                </>
              ) : (
                "Search Leads"
              )}
            </button>
          </form>
          {searchError && (
            <p className="mt-3 flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {searchError}
            </p>
          )}
        </section>

        {/* Results table */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 md:px-6">
            <h2 className="text-lg font-semibold text-slate-900">Potential Leads</h2>
            <p className="text-sm text-slate-500">
              {leads.length === 0 && !searchLoading
                ? "Run a search to see results. Click a row for details. Use “Reveal Contact” to fetch email/phone (1 credit each)."
                : `${leads.length} result${leads.length !== 1 ? "s" : ""}. Click a row for full details.`}
            </p>
          </div>
          {leads.length > 0 ? (
            <>
              {/* Desktop: table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-700 md:px-4">Name</th>
                      <th className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-700 md:px-4">Title</th>
                      <th className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-700 md:px-4">Company</th>
                      <th className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-700 md:px-4">Seniority / Dept</th>
                      <th className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-700 md:px-4">Industry</th>
                      <th className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-700 md:px-4">LinkedIn</th>
                      <th className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-700 text-right md:px-4">Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => {
                      const revealed = revealedMap[lead.id];
                      const seniorityDept =
                        lead.seniority != null && lead.department != null
                          ? `${lead.seniority} / ${lead.department}`
                          : lead.seniority ?? lead.department ?? "—";
                      return (
                        <tr
                          key={lead.id}
                          onClick={() => setDetailLead(lead)}
                          className="border-b border-slate-100 cursor-pointer hover:bg-blue-50/50 transition-colors"
                        >
                          <td className="px-3 py-2.5 text-slate-900 md:px-4">{d(lead.name)}</td>
                          <td className="px-3 py-2.5 text-slate-600 md:px-4">{d(lead.title)}</td>
                          <td className="px-3 py-2.5 text-slate-600 md:px-4">{d(lead.organization_name)}</td>
                          <td className="px-3 py-2.5 text-slate-600 md:px-4">{seniorityDept}</td>
                          <td className="px-3 py-2.5 text-slate-600 md:px-4">{d(lead.industry)}</td>
                          <td className="px-3 py-2.5 md:px-4">
                            {lead.linkedin_url ? (
                              <a
                                href={lead.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-blue-600 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                                <span>View Profile</span>
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right md:px-4" onClick={(e) => e.stopPropagation()}>
                            {revealed ? (
                              <div className="inline-flex flex-col items-end gap-0.5 text-xs text-slate-600">
                                {revealed.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3.5 w-3.5 shrink-0" />
                                    {revealed.email}
                                  </span>
                                )}
                                {revealed.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3.5 w-3.5 shrink-0" />
                                    {revealed.phone}
                                  </span>
                                )}
                                {revealed.direct_dial && (
                                  <span className="flex items-center gap-1 text-slate-500">
                                    Direct: {revealed.direct_dial}
                                  </span>
                                )}
                                {!revealed.email && !revealed.phone && !revealed.direct_dial && (
                                  <span className="text-slate-400">No email/phone returned</span>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openRevealModal(lead);
                                }}
                                className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                              >
                                Reveal Contact
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <div className="flex flex-col gap-4 p-4 md:hidden">
                {leads.map((lead) => {
                  const revealed = revealedMap[lead.id];
                  const seniorityDept =
                    lead.seniority != null && lead.department != null
                      ? `${lead.seniority} / ${lead.department}`
                      : lead.seniority ?? lead.department ?? null;
                  return (
                    <div
                      key={lead.id}
                      onClick={() => setDetailLead(lead)}
                      className="flex cursor-pointer flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50/50"
                    >
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{d(lead.name)}</h3>
                        <p className="mt-0.5 text-sm text-slate-600">{d(lead.title)}</p>
                      </div>
                      <div className="flex flex-col gap-1.5 text-sm">
                        <p className="text-slate-700">
                          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Company:</span>{" "}
                          {d(lead.organization_name)}
                        </p>
                        <p className="text-slate-700">
                          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Industry:</span>{" "}
                          {d(lead.industry)}
                        </p>
                        <p className="text-slate-700">
                          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Seniority:</span>{" "}
                          {seniorityDept != null ? seniorityDept : "—"}
                        </p>
                      </div>
                      <div className="mt-auto w-full" onClick={(e) => e.stopPropagation()}>
                        {revealed ? (
                          <div className="flex w-full flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                            {revealed.email && (
                              <a
                                href={`mailto:${revealed.email}`}
                                className="flex w-full items-center gap-2 text-sm text-blue-600 hover:underline"
                              >
                                <Mail className="h-4 w-4 shrink-0" />
                                {revealed.email}
                              </a>
                            )}
                            {revealed.phone && (
                              <a
                                href={`tel:${revealed.phone}`}
                                className="flex w-full items-center gap-2 text-sm text-blue-600 hover:underline"
                              >
                                <Phone className="h-4 w-4 shrink-0" />
                                {revealed.phone}
                              </a>
                            )}
                            {revealed.direct_dial && !revealed.phone && (
                              <span className="flex w-full items-center gap-2 text-sm text-slate-600">
                                <Phone className="h-4 w-4 shrink-0" />
                                Direct: {revealed.direct_dial}
                              </span>
                            )}
                            {(lead.linkedin_url ?? revealed.linkedin_url) && (
                              <a
                                href={lead.linkedin_url ?? revealed.linkedin_url ?? "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex w-full items-center gap-2 text-sm text-blue-600 hover:underline"
                              >
                                <ExternalLink className="h-4 w-4 shrink-0" />
                                LinkedIn
                              </a>
                            )}
                            {!revealed.email && !revealed.phone && !revealed.direct_dial && (
                              <span className="text-sm text-slate-400">No email/phone returned</span>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openRevealModal(lead)}
                            className="w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                          >
                            Reveal Contact
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
          {leads.length > 0 && hasMore && (
            <div className="border-t border-slate-200 px-4 py-3 md:px-6">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadMoreLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
              >
                {loadMoreLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  "See More"
                )}
              </button>
            </div>
          )}
          {leads.length === 0 && searchLoading ? (
            <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 py-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <p className="text-sm text-slate-500">Searching…</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex min-h-[120px] flex-col items-center justify-center py-10 text-center">
              <User className="h-10 w-10 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">No leads yet</p>
              <p className="text-xs text-slate-400">Use the search above to find potential leads.</p>
            </div>
          ) : null}
        </section>

        {/* Detail drawer */}
        {detailLead && (
          <div
            className="fixed inset-0 z-50 flex justify-end bg-slate-900/30"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-drawer-title"
          >
            <div
              className="w-full max-w-md overflow-y-auto bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                <h3 id="detail-drawer-title" className="text-lg font-semibold text-slate-900">
                  Lead details
                </h3>
                <button
                  type="button"
                  onClick={() => setDetailLead(null)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4 p-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Name</div>
                  <p className="mt-0.5 text-slate-900">{d(detailLead.name)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                    <Briefcase className="h-3.5 w-3.5" /> Title
                  </div>
                  <p className="mt-0.5 text-slate-700">{d(detailLead.title)}</p>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Headline</div>
                  <p className="mt-0.5 text-slate-700">{d(detailLead.headline)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                    <Building2 className="h-3.5 w-3.5" /> Company</div>
                  <p className="mt-0.5 text-slate-700">{d(detailLead.organization_name)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Seniority</div>
                    <p className="mt-0.5 text-slate-700">{d(detailLead.seniority)}</p>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Department</div>
                    <p className="mt-0.5 text-slate-700">{d(detailLead.department)}</p>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Industry</div>
                  <p className="mt-0.5 text-slate-700">{d(detailLead.industry)}</p>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Revenue</div>
                  <p className="mt-0.5 text-slate-700">{d(detailLead.estimated_annual_revenue)}</p>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Employee range</div>
                  <p className="mt-0.5 text-slate-700">{d(detailLead.employee_count)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                    <MapPin className="h-3.5 w-3.5" /> Location
                  </div>
                  <p className="mt-0.5 text-slate-700">{locationStr(detailLead)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                    <Cpu className="h-3.5 w-3.5" /> Technologies
                  </div>
                  <p className="mt-0.5 text-slate-700">
                    {detailLead.technologies?.length
                      ? detailLead.technologies.join(", ")
                      : "—"}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                    <Target className="h-3.5 w-3.5" /> Buying intent
                  </div>
                  <p className="mt-0.5 text-slate-700">{d(detailLead.buying_intent)}</p>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">LinkedIn</div>
                  <p className="mt-0.5">
                    {detailLead.linkedin_url ? (
                      <a
                        href={detailLead.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        Open profile <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
                {revealedMap[detailLead.id] && (
                  <div className="border-t border-slate-200 pt-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">
                      Revealed contact
                    </div>
                    <div className="space-y-1.5 text-sm text-slate-700">
                      {revealedMap[detailLead.id].email && (
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4 shrink-0" /> {revealedMap[detailLead.id].email}
                        </p>
                      )}
                      {revealedMap[detailLead.id].phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4 shrink-0" /> {revealedMap[detailLead.id].phone}
                        </p>
                      )}
                      {revealedMap[detailLead.id].direct_dial && (
                        <p className="flex items-center gap-2 text-slate-600">
                          Direct dial: {revealedMap[detailLead.id].direct_dial}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              className="flex-1 bg-transparent"
              aria-label="Close drawer"
              onClick={() => setDetailLead(null)}
            />
          </div>
        )}

        {/* Confirmation modal */}
        {revealModal && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reveal-modal-title"
          >
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
              <h3 id="reveal-modal-title" className="text-lg font-semibold text-slate-900">
                Smart Reveal — 1 Apollo Credit
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Revealing this contact will consume 1 Apollo Credit and unlock full professional
                insights (Email, LinkedIn, Industry, Revenue). Proceed?
              </p>
              <p className="mt-1 text-xs text-slate-500">
                <strong>{revealModal.name}</strong>
                {revealModal.organization_name && <> · {revealModal.organization_name}</>}
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeRevealModal}
                  disabled={revealLoading}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmReveal}
                  disabled={revealLoading}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {revealLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Revealing…
                    </>
                  ) : (
                    "Proceed"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div
            className={`fixed bottom-4 right-4 z-[70] flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg ${
              toast.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-green-200 bg-green-50 text-green-800"
            }`}
            role="status"
          >
            {toast.type === "error" && <AlertCircle className="h-4 w-4 shrink-0" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
