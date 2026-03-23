import { NextRequest, NextResponse } from "next/server";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  const results: SearchResult[] = [];

  // Try DuckDuckGo instant answer API (free, no key needed)
  try {
    const ddgRes = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_redirect=1&no_html=1`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (ddgRes.ok) {
      const data = await ddgRes.json();

      // Abstract (main answer)
      if (data.Abstract) {
        results.push({
          title: data.Heading || q,
          url: data.AbstractURL || "",
          snippet: data.Abstract.slice(0, 300),
        });
      }

      // Related topics
      if (data.RelatedTopics) {
        for (const topic of data.RelatedTopics.slice(0, 5)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(" - ")[0]?.slice(0, 80) || "",
              url: topic.FirstURL,
              snippet: topic.Text.slice(0, 200),
            });
          }
        }
      }
    }
  } catch {
    // DuckDuckGo failed, continue
  }

  // Also search arXiv for ML-related queries
  try {
    const arxivRes = await fetch(
      `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&sortBy=relevance&max_results=5`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (arxivRes.ok) {
      const xml = await arxivRes.text();
      // Simple XML parsing for titles and links
      const entries = xml.split("<entry>").slice(1);
      for (const entry of entries.slice(0, 5)) {
        const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
        const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
        if (titleMatch && linkMatch) {
          results.push({
            title: titleMatch[1].replace(/\n/g, " ").trim().slice(0, 100),
            url: linkMatch[1].trim(),
            snippet: summaryMatch
              ? summaryMatch[1].replace(/\n/g, " ").trim().slice(0, 200)
              : "",
          });
        }
      }
    }
  } catch {
    // arXiv failed, continue
  }

  return NextResponse.json({ query: q, results });
}
