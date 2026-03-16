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

type GeminiAnalysis = {
  opportunity_level?: string;
  sales_action_plan?: string[];
};

function parseGeminiJson(text: string): GeminiAnalysis | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]) as GeminiAnalysis;
  } catch {
    return null;
  }
}

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

    const prompt = `You are a B2B Sales Strategist for TBP Auto, focusing on penetrating the US market. Analyze these news articles about "${topic}". Filter out noise and identify the top 3 Sales Triggers specifically relevant to the USA or North American market. If an article is totally irrelevant, ignore it.

${headlines}

Provide a JSON response with exactly two keys:
- "opportunity_level": choose strictly one of "High", "Medium", or "Low" based on B2B sales opportunity from this news.
- "sales_action_plan": an array of exactly 3 actionable bullet points (strings) for the tactical action plan. No other keys or markdown.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`;
    console.log("Fetching Gemini...");

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      }),
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

    const text =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const analysis = parseGeminiJson(text);

    const opportunity_level = normalizeOpportunityLevel(analysis?.opportunity_level);
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
