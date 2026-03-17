import { NextRequest, NextResponse } from "next/server";

/** Unified article shape used across all news providers. */
export type Article = {
  title: string;
  description: string;
  source: string;
  url: string;
  image_url: string;
  published_at: string;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
};

type TargetSegment = { segment: string; score: number };

type GeminiAnalysis = {
  opportunity_level?: string;
  target_segments?: TargetSegment[];
  sales_action_plan?: string[];
};

const DEFAULT_TARGET_SEGMENTS: TargetSegment[] = [
  { segment: "Aftermarket Distributors", score: 0 },
  { segment: "Trailer OEMs", score: 0 },
  { segment: "Fleet Operators", score: 0 },
  { segment: "Class 8 OEMs", score: 0 },
];

function normalizeOpportunityLevel(s: string | undefined): "High" | "Medium" | "Low" {
  if (!s || typeof s !== "string") return "Medium";
  const lower = s.trim().toLowerCase();
  if (lower === "high") return "High";
  if (lower === "low") return "Low";
  return "Medium";
}

function toStr(v: unknown): string {
  if (v == null || typeof v !== "string") return "";
  return v.trim();
}

/** GNews: fetch and map to unified Article[]. */
async function fetchGNews(topic: string): Promise<Article[]> {
  const key = process.env.GNEWS_API_KEY?.trim();
  if (!key) return [];

  type GNewsItem = {
    title?: string;
    description?: string;
    url?: string;
    image?: string;
    publishedAt?: string;
    source?: { name?: string };
  };

  try {
    const quotedUrl =
      "https://gnews.io/api/v4/search?q=" +
      encodeURIComponent('"' + topic + '"') +
      "&lang=en&max=6&apikey=" +
      key;
    const quotedRes = await fetch(quotedUrl, { next: { revalidate: 300 } });
    if (!quotedRes.ok) return [];

    const quotedData = (await quotedRes.json()) as { articles?: GNewsItem[] };
    let items = quotedData.articles ?? [];

    if (items.length === 0) {
      const broadUrl =
        "https://gnews.io/api/v4/search?q=" + encodeURIComponent(topic) + "&lang=en&max=6&apikey=" + key;
      const broadRes = await fetch(broadUrl, { next: { revalidate: 300 } });
      if (!broadRes.ok) return [];
      const broadData = (await broadRes.json()) as { articles?: GNewsItem[] };
      items = broadData.articles ?? [];
    }

    return items.map((a) => ({
      title: toStr(a.title),
      description: toStr(a.description),
      source: toStr(a.source?.name) || "Unknown",
      url: toStr(a.url) || "#",
      image_url: toStr(a.image),
      published_at: toStr(a.publishedAt),
    }));
  } catch {
    return [];
  }
}

/** NewsAPI: fetch and map to unified Article[]. */
async function fetchNewsAPI(topic: string): Promise<Article[]> {
  const key = process.env.NEWS_API_KEY?.trim();
  if (!key) return [];

  type NewsAPIItem = {
    title?: string;
    description?: string;
    url?: string;
    urlToImage?: string;
    publishedAt?: string;
    source?: { name?: string };
  };

  try {
    const url =
      "https://newsapi.org/v2/everything?q=" +
      encodeURIComponent(topic) +
      "&language=en&sortBy=publishedAt&pageSize=6&apiKey=" +
      key;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];

    const data = (await res.json()) as { articles?: NewsAPIItem[] };
    const items = data.articles ?? [];
    return items.map((a) => ({
      title: toStr(a.title),
      description: toStr(a.description),
      source: toStr(a.source?.name) || "Unknown",
      url: toStr(a.url) || "#",
      image_url: toStr(a.urlToImage),
      published_at: toStr(a.publishedAt),
    }));
  } catch {
    return [];
  }
}

/** MediaStack: fetch and map to unified Article[]. */
async function fetchMediaStack(topic: string): Promise<Article[]> {
  const key = process.env.MEDIA_STACK_API_KEY?.trim();
  if (!key) return [];

  type MediaStackItem = {
    title?: string;
    description?: string;
    url?: string;
    image?: string;
    source?: string;
    published_at?: string;
  };

  try {
    const url =
      "http://api.mediastack.com/v1/news?keywords=" +
      encodeURIComponent(topic) +
      "&languages=en&limit=6&access_key=" +
      key;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];

    const data = (await res.json()) as { data?: MediaStackItem[] };
    const items = data.data ?? [];
    return items.map((a) => ({
      title: toStr(a.title),
      description: toStr(a.description),
      source: toStr(a.source) || "Unknown",
      url: toStr(a.url) || "#",
      image_url: toStr(a.image),
      published_at: toStr(a.published_at),
    }));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const topic =
      req.nextUrl.searchParams.get("topic")?.trim() || "Automotive";

    const geminiKey = process.env.GEMINI_API_KEY?.trim() || "YOUR_ACTUAL_GEMINI_KEY";

    let articles: Article[] = await fetchGNews(topic);
    if (!articles || articles.length === 0) {
      articles = await fetchNewsAPI(topic);
      if (articles?.length) console.log("Fell back to NewsAPI");
    }
    if (!articles || articles.length === 0) {
      articles = await fetchMediaStack(topic);
      if (articles?.length) console.log("Fell back to MediaStack");
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({
        opportunity_level: "Medium",
        sales_action_plan: ["No recent articles found for this topic. Try a different search or check back later."],
        articles: [],
      });
    }

    const headlines = articles
      .map((a, i) => {
        const title = a.title || "";
        const desc = a.description || "";
        return `${i + 1}. ${title}${desc ? ` — ${desc}` : ""}`;
      })
      .join("\n");

    const prompt = `You are a B2B Sales Director for TBP Auto, exporting Brake Drums to the US. Based on these news articles: ${headlines}

Score the current sales opportunity (0 to 100) for these 4 specific customer segments: "Aftermarket Distributors", "Trailer OEMs", "Fleet Operators", "Class 8 OEMs".

Create a JSON response with:
- "opportunity_level": strictly one of "High", "Medium", or "Low".
- "target_segments": an array of exactly 4 objects, each with "segment" (string, one of the 4 segment names above) and "score" (number 0-100). Include all 4 segments.
- "sales_action_plan": an array of exactly 3 highly specific, actionable strings on how to pitch Brake Drums to the highest-scoring segment.

Keep the action plan bullet points under 15 words each. Be extremely concise.

CRITICAL: You must return ONLY raw, valid JSON. Do NOT wrap the JSON in markdown blocks (no \`\`\`json). Do not add any conversational text.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`;
    console.log("Fetching Gemini...");

    const body = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 2000,
        temperature: 0.2,
      },
    });
    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      throw new Error("Gemini Error: " + err);
    }

    const geminiData = (await geminiRes.json()) as GeminiGenerateContentResponse;

    if (geminiData.error) {
      console.error("Gemini error:", geminiData.error);
      throw new Error(geminiData.error.message ?? "Gemini request failed");
    }

    const rawText = (geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();

    const safeFallback: GeminiAnalysis = {
      opportunity_level: "Medium",
      target_segments: [
        { segment: "Aftermarket Distributors", score: 50 },
        { segment: "Trailer OEMs", score: 50 },
        { segment: "Fleet Operators", score: 50 },
        { segment: "Class 8 OEMs", score: 50 },
      ],
      sales_action_plan: ["System is currently analyzing live data. Please check back shortly."],
    };

    let parsedAI: GeminiAnalysis;
    try {
      parsedAI = JSON.parse(rawText) as GeminiAnalysis;
    } catch {
      console.error("Failed to parse Gemini JSON. Raw text was:", rawText);
      parsedAI = safeFallback;
    }

    const analysis = parsedAI;
    const opportunity_level = normalizeOpportunityLevel(analysis?.opportunity_level);
    const rawSegments = analysis?.target_segments ?? [];
    const parsed =
      Array.isArray(rawSegments) && rawSegments.length > 0
        ? rawSegments
            .filter((s) => s && typeof s.segment === "string" && typeof s.score === "number")
            .map((s) => ({
              segment: String(s.segment).trim() || "Unknown",
              score: Math.min(100, Math.max(0, Number(s.score))),
            }))
        : [];
    const bySegment = new Map(parsed.map((s) => [s.segment, s.score]));
    const target_segments = DEFAULT_TARGET_SEGMENTS.map((d) => ({
      segment: d.segment,
      score: bySegment.get(d.segment) ?? d.score,
    }));
    const sales_action_plan = Array.isArray(analysis?.sales_action_plan)
      ? analysis.sales_action_plan.slice(0, 3).filter((s) => typeof s === "string")
      : [];

    const mappedArticles = articles.map((a, i) => ({
      id: String(i + 1),
      publishedAt: a.published_at,
      source: a.source,
      title: a.title,
      snippet: a.description,
      url: a.url,
      image: a.image_url || null,
    }));

    return NextResponse.json({
      opportunity_level,
      target_segments,
      sales_action_plan,
      articles: mappedArticles,
    });
  } catch (error) {
    console.error("API Route Crashed:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
