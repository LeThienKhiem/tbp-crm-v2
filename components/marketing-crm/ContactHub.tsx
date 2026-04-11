"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Upload,
  CheckCircle2,
  Users,
  MessageSquare,
  X,
  ChevronDown,
  ExternalLink,
  Send,
  Loader2,
  Database,
  Rocket,
  MapPin,
  Briefcase,
  Building2,
  AlertCircle,
} from "lucide-react";
import type { Contact, ContactStatus } from "@/types/marketing";

// ── Color maps ───────────────────────────────────────────────────
const TAG_COLORS: Record<string, string> = {
  fleet: "bg-blue-50 text-blue-700 ring-blue-600/20",
  oem: "bg-purple-50 text-purple-700 ring-purple-600/20",
  aftermarket: "bg-green-50 text-green-700 ring-green-600/20",
  "high-priority": "bg-red-50 text-red-700 ring-red-600/20",
};

const STATUS_COLORS: Record<ContactStatus, string> = {
  new: "bg-slate-50 text-slate-700 ring-slate-600/20",
  approved: "bg-green-50 text-green-700 ring-green-600/20",
  rejected: "bg-red-50 text-red-700 ring-red-600/20",
  in_sequence: "bg-blue-50 text-blue-700 ring-blue-600/20",
  replied: "bg-amber-50 text-amber-700 ring-amber-600/20",
};

const STATUS_LABELS: Record<ContactStatus, string> = {
  new: "New",
  approved: "Approved",
  rejected: "Rejected",
  in_sequence: "In Sequence",
  replied: "Replied",
};

const SOURCE_LABELS: Record<string, string> = {
  apollo_csv: "Apollo CSV",
  apollo: "Apollo",
  manual: "Manual",
  linkedin: "LinkedIn",
  website: "Website",
};

// ── Apollo search result type ────────────────────────────────────
type ApolloLead = {
  id: string;
  name: string;
  title?: string | null;
  organization_name?: string | null;
  linkedin_url?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  seniority?: string | null;
  industry?: string | null;
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
};

// ── Demo CSV contacts ────────────────────────────────────────────
const CSV_DEMO_CONTACTS: Omit<Contact, "id" | "created_at" | "updated_at">[] = [
  {
    first_name: "Sarah", last_name: "Chen", email: "sarah.chen@fleetcorp.com",
    company: "FleetCorp Logistics", title: "VP of Procurement", state: "TX", city: "Dallas",
    source: "apollo_csv", status: "new", tags: ["fleet", "high-priority"],
    industry: "Logistics", phone: "(214) 555-0182", linkedin_url: "https://linkedin.com/in/sarah-chen",
  },
  {
    first_name: "Marcus", last_name: "Rivera", email: "m.rivera@oemsolutions.io",
    company: "OEM Solutions Inc", title: "Director of Parts", state: "MI", city: "Detroit",
    source: "apollo_csv", status: "new", tags: ["oem"],
    industry: "Automotive", phone: "(313) 555-0247", linkedin_url: null,
  },
  {
    first_name: "Linda", last_name: "Nguyen", email: "l.nguyen@greenfleet.co",
    company: "GreenFleet EV", title: "Fleet Manager", state: "CA", city: "San Jose",
    source: "apollo_csv", status: "new", tags: ["fleet", "aftermarket"],
    industry: "Electric Vehicles", phone: "(408) 555-0319", linkedin_url: "https://linkedin.com/in/lindanguyen",
  },
];

// ── Stats card ───────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${color}`}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

// ── Toast ────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in">
      <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
        {type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
        {message}
        <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────
export default function ContactHub() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"mock" | "airtable">("mock");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContactStatus | "all">("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showImportModal, setShowImportModal] = useState(false);
  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ── Apollo search state ────────────────────────────────────────
  const [showApollo, setShowApollo] = useState(false);
  const [apolloQuery, setApolloQuery] = useState("");
  const [apolloCompany, setApolloCompany] = useState("");
  const [apolloTitle, setApolloTitle] = useState("");
  const [apolloLocation, setApolloLocation] = useState("");
  const [apolloSearching, setApolloSearching] = useState(false);
  const [apolloResults, setApolloResults] = useState<ApolloLead[]>([]);
  const [apolloError, setApolloError] = useState<string | null>(null);
  const [apolloSelected, setApolloSelected] = useState<Set<string>>(new Set());
  const [revealedMap, setRevealedMap] = useState<Record<string, RevealedContact>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [savingToAirtable, setSavingToAirtable] = useState(false);

  // ── Fetch contacts ─────────────────────────────────────────────
  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/marketing-crm/contacts");
      if (!res.ok) throw new Error("Failed to fetch contacts");
      const json = await res.json();
      setContacts(json.data ?? []);
      setDataSource(json.source === "airtable" ? "airtable" : "mock");
    } catch {
      setToast({ message: "Failed to load contacts", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // ── Filtering ──────────────────────────────────────────────────
  const filtered = useMemo(() => contacts.filter((c) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term || `${c.first_name} ${c.last_name}`.toLowerCase().includes(term) || c.company.toLowerCase().includes(term) || c.email.toLowerCase().includes(term);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesTag = tagFilter === "all" || c.tags.includes(tagFilter);
    return matchesSearch && matchesStatus && matchesTag;
  }), [contacts, searchTerm, statusFilter, tagFilter]);

  const stats = useMemo(() => ({
    total: contacts.length,
    approved: contacts.filter((c) => c.status === "approved").length,
    inSequence: contacts.filter((c) => c.status === "in_sequence").length,
    replied: contacts.filter((c) => c.status === "replied").length,
  }), [contacts]);

  // ── Checkbox helpers ───────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => prev.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id)));
  }, [filtered]);

  // ── Bulk submit for approval ───────────────────────────────────
  const handleSubmitApproval = useCallback(() => {
    const eligible = contacts.filter((c) => selectedIds.has(c.id) && c.status === "new");
    if (eligible.length === 0) { setToast({ message: "Select contacts with status 'New' to submit", type: "error" }); return; }
    setContacts((prev) => prev.map((c) => selectedIds.has(c.id) && c.status === "new" ? { ...c, status: "approved" as ContactStatus } : c));
    setSelectedIds(new Set());
    setToast({ message: `${eligible.length} contact(s) submitted for approval`, type: "success" });
  }, [contacts, selectedIds]);

  // ── CSV import ─────────────────────────────────────────────────
  const handleImport = useCallback(() => {
    const now = new Date().toISOString();
    const newContacts: Contact[] = CSV_DEMO_CONTACTS.map((c, i) => ({ ...c, id: `import-${Date.now()}-${i}`, created_at: now, updated_at: now }));
    setContacts((prev) => [...newContacts, ...prev]);
    setShowImportModal(false);
    setToast({ message: `Imported ${newContacts.length} contacts`, type: "success" });
  }, []);

  // ── Apollo search ──────────────────────────────────────────────
  const handleApolloSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setApolloError(null);
    setApolloSearching(true);
    setApolloResults([]);
    setApolloSelected(new Set());
    try {
      const res = await fetch("/api/apollo/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: apolloQuery, companyName: apolloCompany, jobTitle: apolloTitle,
          location: apolloLocation, country: "United States", page: 1, perPage: 25,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Search failed (${res.status})`);
      }
      const data = await res.json();
      setApolloResults(data.data?.people ?? data.people ?? []);
    } catch (err) {
      setApolloError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setApolloSearching(false);
    }
  }, [apolloQuery, apolloCompany, apolloTitle, apolloLocation]);

  // ── Apollo reveal ──────────────────────────────────────────────
  const handleReveal = useCallback(async (lead: ApolloLead) => {
    if (revealedMap[lead.id]) return;
    setRevealingId(lead.id);
    try {
      const res = await fetch("/api/apollo/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: lead.id }),
      });
      if (!res.ok) throw new Error("Reveal failed");
      const data = await res.json();
      const contact = data.data ?? data;
      setRevealedMap((prev) => ({ ...prev, [lead.id]: contact }));
      // Auto-select revealed contacts
      setApolloSelected((prev) => new Set(prev).add(lead.id));
    } catch {
      setToast({ message: "Failed to reveal contact. Check Apollo API key.", type: "error" });
    } finally {
      setRevealingId(null);
    }
  }, [revealedMap]);

  // ── Toggle Apollo selection ────────────────────────────────────
  const toggleApolloSelect = useCallback((id: string) => {
    setApolloSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  // ── Save to Airtable ──────────────────────────────────────────
  const handleSaveToAirtable = useCallback(async () => {
    const selected = apolloResults.filter((r) => apolloSelected.has(r.id) && revealedMap[r.id]);
    if (selected.length === 0) {
      setToast({ message: "Reveal contacts first, then select them to save", type: "error" });
      return;
    }

    setSavingToAirtable(true);
    try {
      const contactsPayload = selected.map((lead) => {
        const revealed = revealedMap[lead.id];
        const nameParts = (revealed.name ?? lead.name ?? "").split(" ");
        return {
          apollo_id: lead.id,
          first_name: revealed.first_name ?? nameParts[0] ?? "",
          last_name: revealed.last_name ?? nameParts.slice(1).join(" ") ?? "",
          email: revealed.email ?? "",
          phone: revealed.phone ?? revealed.direct_dial ?? null,
          company: revealed.organization_name ?? lead.organization_name ?? "",
          title: revealed.title ?? lead.title ?? "",
          industry: lead.industry ?? null,
          state: lead.state ?? null,
          city: lead.city ?? null,
          linkedin_url: revealed.linkedin_url ?? lead.linkedin_url ?? null,
        };
      });

      const res = await fetch("/api/marketing-crm/contacts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: contactsPayload }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");

      const result = json.data;
      let msg = `Saved ${result.saved} contact(s) to Airtable`;
      if (result.skipped > 0) msg += ` (${result.skipped} skipped — duplicates)`;
      setToast({ message: msg, type: "success" });

      // Refresh contacts list
      if (result.saved > 0) await fetchContacts();

      // Clear selection
      setApolloSelected(new Set());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setToast({ message: msg, type: "error" });
    } finally {
      setSavingToAirtable(false);
    }
  }, [apolloResults, apolloSelected, revealedMap, fetchContacts]);

  const dismissToast = useCallback(() => setToast(null), []);

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Contacts" value={stats.total} color="bg-slate-100 text-slate-600" />
        <StatCard icon={CheckCircle2} label="Approved" value={stats.approved} color="bg-green-100 text-green-600" />
        <StatCard icon={Send} label="In Sequence" value={stats.inSequence} color="bg-blue-100 text-blue-600" />
        <StatCard icon={MessageSquare} label="Replied" value={stats.replied} color="bg-amber-100 text-amber-600" />
      </div>

      {/* Data source indicator */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Database className="h-3.5 w-3.5" />
        <span>Data source: <span className={`font-medium ${dataSource === "airtable" ? "text-green-600" : "text-amber-600"}`}>{dataSource === "airtable" ? "Airtable" : "Mock Data"}</span></span>
        {dataSource === "mock" && <span className="text-slate-400">(Set AIRTABLE_PAT & AIRTABLE_BASE_ID to connect)</span>}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search name, company, or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
        </div>

        <div className="relative">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ContactStatus | "all")}
            className="appearance-none rounded-lg border border-slate-300 px-3 py-2.5 pr-8 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="in_sequence">In Sequence</option>
            <option value="replied">Replied</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="relative">
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}
            className="appearance-none rounded-lg border border-slate-300 px-3 py-2.5 pr-8 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
            <option value="all">All Tags</option>
            <option value="fleet">Fleet</option>
            <option value="oem">OEM</option>
            <option value="aftermarket">Aftermarket</option>
            <option value="high-priority">High Priority</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>

        <button onClick={() => setShowApollo(!showApollo)}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${showApollo ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-white text-purple-700 ring-1 ring-inset ring-purple-300 hover:bg-purple-50"}`}>
          <Rocket className="h-4 w-4" />
          Apollo Search
        </button>

        <button onClick={() => setShowImportModal(true)}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
          <Upload className="h-4 w-4" /> Import CSV
        </button>

        <button onClick={handleSubmitApproval} disabled={selectedIds.size === 0}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
          Submit for Approval
        </button>
      </div>

      {/* ── Apollo Search Panel ─────────────────────────────────── */}
      {showApollo && (
        <div className="rounded-xl border border-purple-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-purple-600" />
              <h3 className="text-sm font-semibold text-slate-900">Apollo AI — Find Leads</h3>
            </div>
            <button onClick={() => setShowApollo(false)} className="rounded-lg p-1 hover:bg-slate-100">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleApolloSearch} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Keywords..." value={apolloQuery} onChange={(e) => setApolloQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
            </div>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Company..." value={apolloCompany} onChange={(e) => setApolloCompany(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
            </div>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Job title..." value={apolloTitle} onChange={(e) => setApolloTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Location (e.g. Texas)..." value={apolloLocation} onChange={(e) => setApolloLocation(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3">
              <button type="submit" disabled={apolloSearching}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
                {apolloSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {apolloSearching ? "Searching..." : "Search Apollo"}
              </button>
              {apolloResults.length > 0 && (
                <button type="button" onClick={handleSaveToAirtable} disabled={savingToAirtable || apolloSelected.size === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                  {savingToAirtable ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  {savingToAirtable ? "Saving..." : `Save ${apolloSelected.size} to Airtable`}
                </button>
              )}
            </div>
          </form>

          {apolloError && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {apolloError}
            </div>
          )}

          {/* Apollo results */}
          {apolloResults.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-slate-500">{apolloResults.length} results — Reveal to get email, then save to Airtable</p>
              <div className="max-h-[400px] overflow-y-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="sticky top-0">
                    <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <th className="px-3 py-2 w-8">
                        <input type="checkbox"
                          checked={apolloSelected.size === apolloResults.filter((r) => revealedMap[r.id]).length && apolloSelected.size > 0}
                          onChange={() => {
                            const revealedIds = apolloResults.filter((r) => revealedMap[r.id]).map((r) => r.id);
                            setApolloSelected((prev) => prev.size === revealedIds.length ? new Set() : new Set(revealedIds));
                          }}
                          className="rounded border-slate-300" />
                      </th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Company</th>
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Location</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {apolloResults.map((lead) => {
                      const revealed = revealedMap[lead.id];
                      const isRevealing = revealingId === lead.id;
                      return (
                        <tr key={lead.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <input type="checkbox" disabled={!revealed}
                              checked={apolloSelected.has(lead.id)}
                              onChange={() => toggleApolloSelect(lead.id)}
                              className="rounded border-slate-300 disabled:opacity-30" />
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap">
                            {lead.name}
                            {lead.linkedin_url && (
                              <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="ml-1 inline-block text-blue-500 hover:text-blue-700">
                                <ExternalLink className="inline h-3 w-3" />
                              </a>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{lead.organization_name ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-600">{lead.title ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-500 text-xs">
                            {[lead.city, lead.state].filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className="px-3 py-2">
                            {revealed?.email ? (
                              <span className="text-green-700 font-medium">{revealed.email}</span>
                            ) : revealed ? (
                              <span className="text-amber-600 text-xs">No email found</span>
                            ) : (
                              <span className="text-slate-400 text-xs">Hidden</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {revealed ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Revealed
                              </span>
                            ) : (
                              <button onClick={() => handleReveal(lead)} disabled={isRevealing}
                                className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50">
                                {isRevealing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Rocket className="h-3 w-3" />}
                                Reveal
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contact table (md+) */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading contacts...
        </div>
      ) : (
        <>
          <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={filtered.length > 0 && selectedIds.size === filtered.length} onChange={toggleAll} className="rounded border-slate-300" />
                  </th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Tags</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} onClick={() => setDetailContact(c)} className="cursor-pointer hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded border-slate-300" />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{c.first_name} {c.last_name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.company}</td>
                    <td className="px-4 py-3 text-slate-600">{c.title}</td>
                    <td className="px-4 py-3 text-slate-600">{c.email}</td>
                    <td className="px-4 py-3 text-slate-600">{c.state ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.map((t) => (
                          <span key={t} className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${TAG_COLORS[t] ?? "bg-slate-50 text-slate-600 ring-slate-500/20"}`}>{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status]}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{SOURCE_LABELS[c.source] ?? c.source}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">No contacts found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((c) => (
              <div key={c.id} onClick={() => setDetailContact(c)} className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{c.first_name} {c.last_name}</p>
                    <p className="text-sm text-slate-500">{c.title} at {c.company}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status]}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{c.email}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.tags.map((t) => (
                    <span key={t} className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${TAG_COLORS[t] ?? "bg-slate-50 text-slate-600 ring-slate-500/20"}`}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="py-12 text-center text-sm text-slate-500">No contacts found</p>}
          </div>
        </>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Import CSV Preview</h3>
              <button onClick={() => setShowImportModal(false)} className="rounded-lg p-1 hover:bg-slate-100"><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <th className="px-3 py-2">Name</th><th className="px-3 py-2">Company</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CSV_DEMO_CONTACTS.map((c, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-slate-900">{c.first_name} {c.last_name}</td>
                      <td className="px-3 py-2 text-slate-600">{c.company}</td>
                      <td className="px-3 py-2 text-slate-600">{c.email}</td>
                      <td className="px-3 py-2 text-slate-600">{c.state}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowImportModal(false)} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Cancel</button>
              <button onClick={handleImport} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">Import 3 Contacts</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {detailContact && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDetailContact(null)} />
          <div className="relative w-full max-w-md animate-in slide-in-from-right bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Contact Details</h3>
              <button onClick={() => setDetailContact(null)} className="rounded-lg p-1 hover:bg-slate-100"><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            <div className="space-y-5 px-6 py-5">
              <div>
                <p className="text-xl font-semibold text-slate-900">{detailContact.first_name} {detailContact.last_name}</p>
                <p className="text-sm text-slate-500">{detailContact.title} at {detailContact.company}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_COLORS[detailContact.status]}`}>{STATUS_LABELS[detailContact.status]}</span>
                {detailContact.tags.map((t) => (
                  <span key={t} className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${TAG_COLORS[t] ?? "bg-slate-50 text-slate-600 ring-slate-500/20"}`}>{t}</span>
                ))}
              </div>
              <div className="space-y-3 text-sm">
                <DetailRow label="Email" value={detailContact.email} />
                <DetailRow label="Phone" value={detailContact.phone ?? "-"} />
                <DetailRow label="Company" value={detailContact.company} />
                <DetailRow label="Title" value={detailContact.title} />
                <DetailRow label="Industry" value={detailContact.industry ?? "-"} />
                <DetailRow label="State" value={detailContact.state ?? "-"} />
                <DetailRow label="City" value={detailContact.city ?? "-"} />
                <DetailRow label="Source" value={SOURCE_LABELS[detailContact.source] ?? detailContact.source} />
                {detailContact.linkedin_url && (
                  <div className="flex items-start justify-between py-1">
                    <span className="text-slate-500">LinkedIn</span>
                    <a href={detailContact.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                      Profile <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
                <DetailRow label="Created" value={new Date(detailContact.created_at).toLocaleDateString()} />
                <DetailRow label="Updated" value={new Date(detailContact.updated_at).toLocaleDateString()} />
                {detailContact.approved_at && <DetailRow label="Approved" value={new Date(detailContact.approved_at).toLocaleDateString()} />}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={dismissToast} />}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-1">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-900">{value}</span>
    </div>
  );
}
