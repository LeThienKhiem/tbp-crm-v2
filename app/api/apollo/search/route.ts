import { NextRequest, NextResponse } from "next/server";
import { apiSearch } from "@/services/apolloService";

/** Ensure Apollo API key is set in server context (API route). */
function ensureApolloKey(): void {
  if (!process.env.APOLLO_API_KEY?.trim()) {
    throw new Error("APOLLO_API_KEY is not set. Add it to .env.local and restart the dev server.");
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureApolloKey();

    const body = await req.json().catch(() => ({}));
    const query = typeof body.query === "string" ? body.query : undefined;
    const jobTitle = typeof body.jobTitle === "string" ? body.jobTitle : undefined;
    const industry = typeof body.industry === "string" ? body.industry : undefined;
    const location = typeof body.location === "string" ? body.location : undefined;
    const page = typeof body.page === "number" ? body.page : 1;
    const perPage = typeof body.perPage === "number" ? Math.min(body.perPage, 25) : 25;

    const result = await apiSearch({
      query,
      jobTitle,
      industry,
      location,
      page,
      perPage,
    });

    console.log("RAW APOLLO:", result);

    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    const isAuth =
      message.toLowerCase().includes("api key") ||
      message.toLowerCase().includes("apollo_api_key");
    return NextResponse.json(
      { error: message },
      { status: isAuth ? 401 : 500 }
    );
  }
}
