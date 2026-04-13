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
  Plus,
  Tag,
  Trash2,
  Edit3,
  FolderOpen,
  Clock,
} from "lucide-react";
import type { Contact, ContactStatus } from "@/types/marketing";
import ActivityTimeline from "./ActivityTimeline";

// ── Contact Group type ──────────────────────────────────────────
interface ContactGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  contact_count: number;
  created_by: string;
  created_at: string;
}

// ── Color maps ───────────────────────────────────────────────────
const GROUP_COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  green: "bg-green-50 text-green-700 ring-green-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  purple: "bg-purple-50 text-purple-700 ring-purple-600/20",
  orange: "bg-orange-50 text-orange-700 ring-orange-600/20",
  pink: "bg-pink-50 text-pink-700 ring-pink-600/20",
  teal: "bg-teal-50 text-teal-700 ring-teal-600/20",
  yellow: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  gray: "bg-slate-50 text-slate-600 ring-slate-500/20",
};

const GROUP_COLOR_OPTIONS = [
  { id: "blue", label: "Blue", dot: "bg-blue-500" },
  { id: "green", label: "Green", dot: "bg-green-500" },
  { id: "red", label: "Red", dot: "bg-red-500" },
  { id: "purple", label: "Purple", dot: "bg-purple-500" },
  { id: "orange", label: "Orange", dot: "bg-orange-500" },
  { id: "pink", label: "Pink", dot: "bg-pink-500" },
  { id: "teal", label: "Teal", dot: "bg-teal-500" },
  { id: "yellow", label: "Yellow", dot: "bg-yellow-500" },
  { id: "gray", label: "Gray", dot: "bg-slate-400" },
];

function getGroupStyle(groups: ContactGroup[], tagName: string): string {
  const group = groups.find((g) => g.name.toLowerCase() === tagName.toLowerCase());
  return GROUP_COLOR_MAP[group?.color ?? "gray"] ?? GROUP_COLOR_MAP.gray;
}

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

// ── CSV column name normalizer ───────────────────────────────────
const CSV_COLUMN_MAP: Record<string, string> = {
  first_name: "first_name", firstname: "first_name", "first name": "first_name", first: "first_name",
  last_name: "last_name", lastname: "last_name", "last name": "last_name", last: "last_name",
  email: "email", "email address": "email", emailaddress: "email", "e-mail": "email",
  phone: "phone", "phone number": "phone", phonenumber: "phone", telephone: "phone", mobile: "phone",
  company: "company", "company name": "company", companyname: "company", organization: "company",
  title: "title", "job title": "title", jobtitle: "title", position: "title", role: "title",
  industry: "industry", state: "state", "state/region": "state", region: "state", city: "city",
  linkedin_url: "linkedin_url", linkedinurl: "linkedin_url", linkedin: "linkedin_url", "linkedin url": "linkedin_url",
  tags: "tags", tag: "tags", labels: "tags",
};

function normalizeCsvCol(col: string): string | null {
  const key = col.trim().toLowerCase().replace(/[_\-]/g, " ").replace(/\s+/g, " ");
  return CSV_COLUMN_MAP[key] ?? CSV_COLUMN_MAP[key.replace(/\s/g, "")] ?? null;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; } else { inQuotes = false; }
      } else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") { fields.push(current.trim()); current = ""; }
      else { current += ch; }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsvText(text: string): string[][] {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
    .map((line) => parseCsvLine(line))
    .filter((row) => row.some((cell) => cell.length > 0));
}

// ── CSV import types ────────────────────────────────────────────
interface CsvImportResult { saved: number; skipped: number; errors: string[]; total_rows: number }
type CsvImportStep = "upload" | "preview" | "importing" | "done";

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

  // ── CSV file upload state ──────────────────────────────────────
  const [csvStep, setCsvStep] = useState<CsvImportStep>("upload");
  const [csvText, setCsvText] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvColumnMap, setCsvColumnMap] = useState<(string | null)[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<CsvImportResult | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvDragOver, setCsvDragOver] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // ── Contact Groups state ───────────────────────────────────────
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("blue");
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);
  const [showGroupAssign, setShowGroupAssign] = useState(false);
  const [assignChecked, setAssignChecked] = useState<Set<string>>(new Set());

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

  // ── Fetch groups ───────────────────────────────────────────────
  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/marketing-crm/contact-groups");
      if (!res.ok) return;
      const json = await res.json();
      setGroups(json.data ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchContacts(); fetchGroups(); }, [fetchContacts, fetchGroups]);

  // ── Group CRUD ────────────────────────────────────────────────
  async function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    try {
      const res = await fetch("/api/marketing-crm/contact-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim(), description: newGroupDesc, color: newGroupColor }),
      });
      if (!res.ok) throw new Error();
      setNewGroupName(""); setNewGroupDesc(""); setNewGroupColor("blue");
      fetchGroups();
      setToast({ message: `Group "${newGroupName.trim()}" created`, type: "success" });
    } catch {
      setToast({ message: "Failed to create group", type: "error" });
    }
  }

  async function handleUpdateGroup() {
    if (!editingGroup) return;
    try {
      const res = await fetch("/api/marketing-crm/contact-groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingGroup.id, name: editingGroup.name, description: editingGroup.description, color: editingGroup.color }),
      });
      if (!res.ok) throw new Error();
      setEditingGroup(null);
      fetchGroups();
      setToast({ message: "Group updated", type: "success" });
    } catch {
      setToast({ message: "Failed to update group", type: "error" });
    }
  }

  async function handleDeleteGroup(g: ContactGroup) {
    if (!confirm(`Delete group "${g.name}"? Contacts won't be deleted.`)) return;
    try {
      const res = await fetch(`/api/marketing-crm/contact-groups?id=${g.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      fetchGroups();
      setToast({ message: `Group "${g.name}" deleted`, type: "success" });
    } catch {
      setToast({ message: "Failed to delete group", type: "error" });
    }
  }

  // ── Assign groups to selected contacts ────────────────────────
  async function handleAssignGroups(groupNames: string[]) {
    const selected = contacts.filter((c) => selectedIds.has(c.id));
    if (selected.length === 0) return;
    try {
      // For each selected contact, merge new groups into existing tags
      const updates = selected.map((c) => {
        const existingTags = new Set(c.tags);
        groupNames.forEach((g) => existingTags.add(g));
        return { id: c.id, fields: { tags: Array.from(existingTags) } };
      });
      const res = await fetch("/api/marketing-crm/contacts/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error();
      setShowGroupAssign(false);
      setSelectedIds(new Set());
      fetchContacts();
      setToast({ message: `${selected.length} contacts updated with groups`, type: "success" });
    } catch {
      setToast({ message: "Failed to assign groups", type: "error" });
    }
  }

  async function handleRemoveGroup(contact: Contact, groupName: string) {
    try {
      const newTags = contact.tags.filter((t) => t !== groupName);
      const res = await fetch("/api/marketing-crm/contacts/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: [{ id: contact.id, fields: { tags: newTags } }] }),
      });
      if (!res.ok) throw new Error();
      fetchContacts();
      if (detailContact?.id === contact.id) setDetailContact({ ...contact, tags: newTags });
    } catch {
      setToast({ message: "Failed to remove group", type: "error" });
    }
  }

  // ── Filtering ──────────────────────────────────────────────────
  const filtered = useMemo(() => contacts.filter((c) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term || `${c.first_name} ${c.last_name}`.toLowerCase().includes(term) || c.company.toLowerCase().includes(term) || c.email.toLowerCase().includes(term);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesTag = tagFilter === "all" || (tagFilter === "__untagged__" ? c.tags.length === 0 : c.tags.some((t) => t.toLowerCase() === tagFilter.toLowerCase()));
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
  const resetCsvState = useCallback(() => {
    setCsvStep("upload"); setCsvText(""); setCsvFileName(""); setCsvRows([]);
    setCsvColumnMap([]); setCsvImporting(false); setCsvResult(null); setCsvError(null); setCsvDragOver(false);
  }, []);

  const handleCsvFileRead = useCallback((text: string, fileName: string) => {
    setCsvText(text);
    setCsvFileName(fileName);
    setCsvError(null);
    const rows = parseCsvText(text);
    if (rows.length < 2) { setCsvError("CSV must have a header row and at least one data row."); return; }
    const headerRow = rows[0];
    const mapping = headerRow.map((col) => normalizeCsvCol(col));
    if (!mapping.includes("email")) { setCsvError(`Could not find an email column. Headers: ${headerRow.join(", ")}`); return; }
    setCsvRows(rows);
    setCsvColumnMap(mapping);
    setCsvStep("preview");
  }, []);

  const handleCsvFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setCsvDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith(".csv")) { setCsvError("Please drop a .csv file"); return; }
    const reader = new FileReader();
    reader.onload = () => handleCsvFileRead(reader.result as string, file.name);
    reader.readAsText(file);
  }, [handleCsvFileRead]);

  const handleCsvFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleCsvFileRead(reader.result as string, file.name);
    reader.readAsText(file);
  }, [handleCsvFileRead]);

  const handleCsvImport = useCallback(async () => {
    setCsvStep("importing"); setCsvImporting(true); setCsvError(null);
    try {
      const res = await fetch("/api/marketing-crm/contacts/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv_text: csvText }),
      });
      const data = await res.json();
      if (!res.ok) { setCsvError(data.error || "Import failed"); setCsvStep("preview"); setCsvImporting(false); return; }
      setCsvResult(data as CsvImportResult);
      setCsvStep("done");
      if (data.saved > 0) {
        // Refresh contacts list
        try {
          const listRes = await fetch("/api/marketing-crm/contacts");
          const listData = await listRes.json();
          if (listData.data) setContacts(listData.data);
        } catch { /* ignore refresh failure */ }
      }
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : "Network error");
      setCsvStep("preview");
    } finally { setCsvImporting(false); }
  }, [csvText]);

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
      const people = data.data?.people ?? data.people ?? [];
      setApolloResults(people);
      if (people.length === 0) {
        setApolloError("No results found. Try broadening your search — use fewer filters or check spelling.");
      }
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
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
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
            <option value="all">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.name}>{g.name}</option>
            ))}
            <option value="__untagged__">— No Group —</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>

        <button onClick={() => setShowGroupManager(!showGroupManager)}
          className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${showGroupManager ? "bg-teal-600 text-white" : "bg-white text-teal-700 ring-1 ring-inset ring-teal-300 hover:bg-teal-50"}`}>
          <FolderOpen className="h-4 w-4" />
          Groups
        </button>

        {selectedIds.size > 0 && (
          <button onClick={() => setShowGroupAssign(true)}
            className="flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-300 hover:bg-indigo-50">
            <Tag className="h-4 w-4" />
            Assign Group ({selectedIds.size})
          </button>
        )}

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
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
            </div>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Company..." value={apolloCompany} onChange={(e) => setApolloCompany(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
            </div>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Job title..." value={apolloTitle} onChange={(e) => setApolloTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Location (e.g. Texas)..." value={apolloLocation} onChange={(e) => setApolloLocation(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
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
            <div className={`mt-3 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
              apolloError.includes("No results")
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}>
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

      {/* ── Group Manager Panel ────────────────────────────────── */}
      {showGroupManager && (
        <div className="rounded-xl border border-teal-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-teal-600" />
              <h3 className="text-sm font-semibold text-slate-900">Contact Groups</h3>
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">{groups.length}</span>
            </div>
            <button onClick={() => setShowGroupManager(false)} className="rounded-lg p-1 hover:bg-slate-100">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          {/* Create new group */}
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex-1 min-w-[160px]">
              <label className="mb-1 block text-xs font-medium text-slate-600">Group Name *</label>
              <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g. Distributors TX"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
              <input value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder="Optional note"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="w-[120px]">
              <label className="mb-1 block text-xs font-medium text-slate-600">Color</label>
              <select value={newGroupColor} onChange={(e) => setNewGroupColor(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500">
                {GROUP_COLOR_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <button onClick={handleCreateGroup} disabled={!newGroupName.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
              <Plus className="h-4 w-4" /> Create
            </button>
          </div>

          {/* Group list */}
          {groups.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">No groups yet. Create your first group above.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((g) => {
                const contactsInGroup = contacts.filter((c) => c.tags.some((t) => t.toLowerCase() === g.name.toLowerCase())).length;
                return editingGroup?.id === g.id ? (
                  <div key={g.id} className="rounded-lg border-2 border-teal-300 bg-teal-50 p-3 space-y-2">
                    <input value={editingGroup.name} onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900" />
                    <input value={editingGroup.description} onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                      placeholder="Description" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900" />
                    <select value={editingGroup.color} onChange={(e) => setEditingGroup({ ...editingGroup, color: e.target.value })}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                      {GROUP_COLOR_OPTIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <button onClick={handleUpdateGroup} className="rounded bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700">Save</button>
                      <button onClick={() => setEditingGroup(null)} className="rounded bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-300">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div key={g.id} className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`inline-block h-3 w-3 rounded-full ${GROUP_COLOR_OPTIONS.find((c) => c.id === g.color)?.dot ?? "bg-slate-400"}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{g.name}</p>
                        {g.description && <p className="text-xs text-slate-400 truncate">{g.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{contactsInGroup}</span>
                      <button onClick={() => setEditingGroup(g)} className="hidden rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 group-hover:block">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDeleteGroup(g)} className="hidden rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 group-hover:block">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Assign Group Modal ─────────────────────────────────── */}
      {showGroupAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-semibold text-slate-900">Assign Groups</h3>
            <p className="mb-4 text-sm text-slate-500">{selectedIds.size} contact{selectedIds.size > 1 ? "s" : ""} selected. Choose groups to assign:</p>
            {groups.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No groups created yet. Open the Groups panel to create one.</p>
            ) : (
              <div className="mb-4 max-h-[300px] space-y-2 overflow-y-auto">
                {groups.map((g) => (
                  <label key={g.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 hover:bg-slate-50">
                    <input type="checkbox" checked={assignChecked.has(g.name)}
                      onChange={(e) => { const s = new Set(assignChecked); if (e.target.checked) s.add(g.name); else s.delete(g.name); setAssignChecked(s); }}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                    <span className={`inline-block h-3 w-3 rounded-full ${GROUP_COLOR_OPTIONS.find((c) => c.id === g.color)?.dot ?? "bg-slate-400"}`} />
                    <span className="text-sm font-medium text-slate-700">{g.name}</span>
                    {g.description && <span className="text-xs text-slate-400">— {g.description}</span>}
                  </label>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowGroupAssign(false); setAssignChecked(new Set()); }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button disabled={groups.length === 0 || assignChecked.size === 0}
                onClick={() => { handleAssignGroups(Array.from(assignChecked)); setAssignChecked(new Set()); }}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                Assign {assignChecked.size > 0 ? `(${assignChecked.size})` : ""}
              </button>
            </div>
          </div>
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
                  <tr key={c.id} onClick={() => { setDetailContact(c); setEditingNotes(false); }} className="cursor-pointer hover:bg-slate-50 transition-colors">
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
                          <span key={t} className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getGroupStyle(groups, t)}`}>{t}</span>
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
              <div key={c.id} onClick={() => { setDetailContact(c); setEditingNotes(false); }} className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
                    <span key={t} className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getGroupStyle(groups, t)}`}>{t}</span>
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
          <div className="mx-4 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {csvStep === "upload" && "Import CSV"}
                {csvStep === "preview" && "Preview Import"}
                {csvStep === "importing" && "Importing..."}
                {csvStep === "done" && "Import Complete"}
              </h3>
              <button onClick={() => { setShowImportModal(false); resetCsvState(); }} className="rounded-lg p-1 hover:bg-slate-100"><X className="h-5 w-5 text-slate-500" /></button>
            </div>

            {/* Step 1: Upload */}
            {csvStep === "upload" && (
              <div className="mt-4">
                <div
                  onDragOver={(e) => { e.preventDefault(); setCsvDragOver(true); }}
                  onDragLeave={() => setCsvDragOver(false)}
                  onDrop={handleCsvFileDrop}
                  className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${csvDragOver ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-slate-400"}`}
                >
                  <Upload className="mb-3 h-10 w-10 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">Drag & drop a CSV file here</p>
                  <p className="mt-1 text-xs text-slate-500">or click below to browse</p>
                  <label className="mt-4 cursor-pointer rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                    Choose File
                    <input type="file" accept=".csv" onChange={handleCsvFileSelect} className="hidden" />
                  </label>
                </div>
                {csvError && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {csvError}
                  </div>
                )}
                <p className="mt-3 text-xs text-slate-500">Supported columns: first_name, last_name, email, phone, company, title, industry, state, city, linkedin_url, tags</p>
              </div>
            )}

            {/* Step 2: Preview */}
            {csvStep === "preview" && csvRows.length > 1 && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Database className="h-4 w-4" />
                  <span className="font-medium">{csvFileName}</span>
                  <span className="text-slate-400">|</span>
                  <span>{csvRows.length - 1} row{csvRows.length - 1 !== 1 ? "s" : ""} detected</span>
                </div>

                {/* Column mapping */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Column Mapping</p>
                  <div className="flex flex-wrap gap-2">
                    {csvRows[0].map((header, i) => (
                      <div key={i} className={`rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${csvColumnMap[i] ? "bg-green-50 text-green-700 ring-green-600/20" : "bg-slate-100 text-slate-400 ring-slate-300"}`}>
                        {header} {csvColumnMap[i] ? `\u2192 ${csvColumnMap[i]}` : "(skipped)"}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview table (first 5 rows) */}
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {csvRows[0].map((h, i) => <th key={i} className="px-3 py-2 whitespace-nowrap">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {csvRows.slice(1, 6).map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => <td key={j} className="px-3 py-2 text-slate-600 whitespace-nowrap max-w-[200px] truncate">{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {csvRows.length > 6 && <p className="text-xs text-slate-500">Showing first 5 of {csvRows.length - 1} rows</p>}

                {csvError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {csvError}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button onClick={resetCsvState} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Back</button>
                  <button onClick={handleCsvImport} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                    Import {csvRows.length - 1} Contact{csvRows.length - 1 !== 1 ? "s" : ""}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Importing */}
            {csvStep === "importing" && (
              <div className="mt-6 flex flex-col items-center py-8">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <p className="mt-4 text-sm font-medium text-slate-700">Importing contacts to Airtable...</p>
                <p className="mt-1 text-xs text-slate-500">This may take a moment for large files</p>
              </div>
            )}

            {/* Step 4: Done */}
            {csvStep === "done" && csvResult && (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="text-sm font-semibold">Import complete</p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-700">{csvResult.saved}</p>
                      <p className="text-xs text-green-600">Saved</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-600">{csvResult.skipped}</p>
                      <p className="text-xs text-slate-500">Skipped</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-600">{csvResult.total_rows}</p>
                      <p className="text-xs text-slate-500">Total Rows</p>
                    </div>
                  </div>
                </div>
                {csvResult.errors.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-600">Errors</p>
                    <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-red-700">
                      {csvResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
                )}
                <div className="flex justify-end">
                  <button onClick={() => { setShowImportModal(false); resetCsvState(); }} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">Done</button>
                </div>
              </div>
            )}
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
                  <span key={t} className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getGroupStyle(groups, t)}`}>{t}</span>
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
              {/* Notes section */}
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Notes</span>
                  {!editingNotes && (
                    <button
                      onClick={() => { setEditingNotes(true); setNoteDraft(detailContact.notes ?? ""); }}
                      className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {editingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      rows={4}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Add a note about this contact..."
                    />
                    <div className="flex items-center gap-2">
                      <button
                        disabled={savingNote}
                        onClick={async () => {
                          setSavingNote(true);
                          try {
                            const res = await fetch("/api/marketing-crm/contacts/update", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ updates: [{ id: detailContact.id, fields: { notes: noteDraft } }] }),
                            });
                            if (!res.ok) throw new Error("Failed to save note");
                            // Update local state
                            const updatedContact = { ...detailContact, notes: noteDraft || null };
                            setDetailContact(updatedContact);
                            setContacts((prev) => prev.map((c) => c.id === detailContact.id ? { ...c, notes: noteDraft || null } : c));
                            setEditingNotes(false);
                            setToast({ message: "Note saved", type: "success" });
                          } catch {
                            setToast({ message: "Failed to save note", type: "error" });
                          } finally {
                            setSavingNote(false);
                          }
                        }}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {savingNote ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingNotes(false)}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">
                    {detailContact.notes || "No notes yet"}
                  </p>
                )}
              </div>
              {/* Activity Timeline section */}
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">Activity Timeline</span>
                </div>
                <ActivityTimeline contactId={detailContact.id} contactEmail={detailContact.email} />
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
