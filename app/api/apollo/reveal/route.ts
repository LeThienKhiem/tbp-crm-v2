import { NextRequest, NextResponse } from "next/server";
import { revealContact } from "@/services/apolloService";

/** Ensure Apollo API key is set in server context (API route). */
function ensureApolloKey(): void {
  if (!process.env.APOLLO_API_KEY?.trim()) {
    throw new Error("APOLLO_API_KEY is not set. Add it to .env.local and restart the dev server.");
  }
}

/** Validate person_id from frontend before calling Apollo people/match. */
function validatePersonId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 256) return null;
  return trimmed;
}

export async function POST(req: NextRequest) {
  try {
    ensureApolloKey();

    const body = await req.json().catch(() => ({}));
    const personId = validatePersonId(body.personId ?? body.person_id);
    if (!personId) {
      return NextResponse.json(
        { error: "personId is required and must be a non-empty string (max 256 chars)." },
        { status: 400 }
      );
    }

    const contact = await revealContact(personId);
    return NextResponse.json({ data: contact });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reveal failed";
    const isAuth =
      message.toLowerCase().includes("api key") ||
      message.toLowerCase().includes("apollo_api_key");
    const isNotFound = message.toLowerCase().includes("not found");
    const status = isAuth ? 401 : isNotFound ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
