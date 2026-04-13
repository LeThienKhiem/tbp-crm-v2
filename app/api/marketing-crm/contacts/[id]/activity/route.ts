import { NextRequest, NextResponse } from "next/server";
import { listContacts } from "@/services/airtableService";
import { listSendLogs } from "@/services/airtableCrm";
import * as instantly from "@/services/instantlyService";

// ── Types ────────────────────────────────────────────────────────

interface ActivityEvent {
  id: string;
  timestamp: string;
  type:
    | "contact_created"
    | "status_change"
    | "email_sent"
    | "email_opened"
    | "email_replied"
    | "note_added"
    | "campaign_added";
  title: string;
  description?: string;
  icon: string;
  color: string;
  metadata?: Record<string, unknown>;
}

// ── Helpers ──────────────────────────────────────────────────────

function iconForType(type: ActivityEvent["type"]): string {
  const map: Record<ActivityEvent["type"], string> = {
    contact_created: "UserPlus",
    status_change: "GitBranch",
    email_sent: "Send",
    email_opened: "Eye",
    email_replied: "MessageSquare",
    note_added: "StickyNote",
    campaign_added: "Megaphone",
  };
  return map[type];
}

function colorForType(type: ActivityEvent["type"]): string {
  const map: Record<ActivityEvent["type"], string> = {
    contact_created: "green",
    status_change: "blue",
    email_sent: "blue",
    email_opened: "amber",
    email_replied: "green",
    note_added: "purple",
    campaign_added: "indigo",
  };
  return map[type];
}

// ── GET handler ──────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Find the contact
    const allContacts = await listContacts();
    const contact = allContacts.find((c) => c.id === id);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const events: ActivityEvent[] = [];

    // 2. Contact lifecycle events
    events.push({
      id: `created-${contact.id}`,
      timestamp: contact.created_at,
      type: "contact_created",
      title: "Contact created",
      description: `Added via ${contact.source ?? "unknown source"}`,
      icon: iconForType("contact_created"),
      color: colorForType("contact_created"),
    });

    if (contact.approved_at) {
      events.push({
        id: `approved-${contact.id}`,
        timestamp: contact.approved_at,
        type: "status_change",
        title: "Contact approved",
        description: contact.approved_by ? `Approved by ${contact.approved_by}` : undefined,
        icon: iconForType("status_change"),
        color: colorForType("status_change"),
      });
    }

    if (contact.updated_at && contact.updated_at !== contact.created_at) {
      events.push({
        id: `updated-${contact.id}`,
        timestamp: contact.updated_at,
        type: "status_change",
        title: `Status: ${contact.status}`,
        description: "Contact record updated",
        icon: iconForType("status_change"),
        color: colorForType("status_change"),
      });
    }

    if (contact.notes) {
      events.push({
        id: `note-${contact.id}`,
        timestamp: contact.updated_at,
        type: "note_added",
        title: "Note added",
        description: contact.notes.length > 120 ? contact.notes.slice(0, 120) + "..." : contact.notes,
        icon: iconForType("note_added"),
        color: colorForType("note_added"),
      });
    }

    // 3. Send logs from Airtable
    try {
      const allLogs = await listSendLogs();
      const contactLogs = allLogs.filter(
        (log) => log.contact_email.toLowerCase() === contact.email.toLowerCase()
      );

      for (const log of contactLogs) {
        // Email sent event
        if (log.sent_at) {
          events.push({
            id: `sent-${log.id}`,
            timestamp: log.sent_at,
            type: "email_sent",
            title: `Email sent: ${log.subject || "No subject"}`,
            description: log.campaign_name ? `Campaign: ${log.campaign_name}` : undefined,
            icon: iconForType("email_sent"),
            color: colorForType("email_sent"),
            metadata: { campaign_id: log.campaign_id, step: log.sequence_step },
          });
        }

        // Email opened event
        if (log.opened_at) {
          events.push({
            id: `opened-${log.id}`,
            timestamp: log.opened_at,
            type: "email_opened",
            title: `Email opened: ${log.subject || "No subject"}`,
            icon: iconForType("email_opened"),
            color: colorForType("email_opened"),
          });
        }

        // Email replied event
        if (log.replied_at) {
          events.push({
            id: `replied-${log.id}`,
            timestamp: log.replied_at,
            type: "email_replied",
            title: `Reply received: ${log.subject || "No subject"}`,
            icon: iconForType("email_replied"),
            color: colorForType("email_replied"),
          });
        }
      }
    } catch {
      // Send logs not available — skip silently
    }

    // 4. Instantly emails (if configured)
    try {
      if (instantly.isConfigured()) {
        const emails = await instantly.listEmails(undefined, 100);
        const contactEmails = emails.filter(
          (e) =>
            e.to_address_email?.toLowerCase() === contact.email.toLowerCase() ||
            e.from_address_email?.toLowerCase() === contact.email.toLowerCase()
        );

        for (const email of contactEmails) {
          const isSent = email.email_type === "sent";
          const type: ActivityEvent["type"] = isSent ? "email_sent" : "email_replied";
          events.push({
            id: `instantly-${email.id}`,
            timestamp: email.timestamp_created,
            type,
            title: `${isSent ? "Email sent" : "Reply received"}: ${email.subject || "No subject"}`,
            description: isSent
              ? `Sent from ${email.from_address_email}`
              : `From ${email.from_address_email}`,
            icon: iconForType(type),
            color: colorForType(type),
            metadata: { campaign_id: email.campaign_id },
          });
        }
      }
    } catch {
      // Instantly not configured or errored — skip silently
    }

    // 5. Deduplicate by id and sort desc
    const seen = new Set<string>();
    const unique = events.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ data: unique });
  } catch (err) {
    console.error("[activity] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
