import { NextRequest, NextResponse } from "next/server";
import { apiSearch, ApolloApiError } from "@/services/apolloService";

/** Ensure Apollo API key is set in server context (API route). */
function ensureApolloKey(): void {
  if (!process.env.APOLLO_API_KEY?.trim()) {
    throw new Error("APOLLO_API_KEY is not set. Add it to .env.local and restart the dev server.");
  }
}

/** Only include in searchParams if the value is a non-empty string. */
function optStr(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

export async function POST(req: NextRequest) {
  try {
    ensureApolloKey();

    const body = await req.json().catch(() => ({}));
    const query = optStr(body.query);
    const companyName = optStr(body.companyName ?? body.company_name);
    const jobTitle = optStr(body.jobTitle ?? body.title);
    const industry = optStr(body.industry);
    const location = optStr(body.location);
    const country = optStr(body.country) ?? "United States";
    const page = typeof body.page === "number" ? body.page : 1;
    const perPage = typeof body.perPage === "number" ? Math.min(body.perPage, 20) : 20;

    const result = await apiSearch({
      query,
      companyName,
      jobTitle,
      industry,
      location,
      country,
      page,
      perPage,
    });

    console.log("RAW APOLLO:", result);

    return NextResponse.json({ data: result });
  } catch (err) {
    if (err instanceof ApolloApiError) {
      const status = err.statusCode === 422 ? 422 : err.statusCode === 400 ? 400 : err.statusCode;
      return NextResponse.json({ error: err.message }, { status });
    }
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
