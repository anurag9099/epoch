import Parser from "rss-parser";

const parser = new Parser();

interface FeedItem {
  source: string;
  title: string;
  url: string;
  summary: string;
  published_at: string;
}

const RSS_SOURCES = [
  { name: "huggingface", url: "https://huggingface.co/blog/feed.xml" },
  { name: "pytorch", url: "https://pytorch.org/blog/feed.xml" },
  { name: "lilianweng", url: "https://lilianweng.github.io/index.xml" },
  { name: "interconnects", url: "https://www.interconnects.ai/feed" },
];

const ARXIV_QUERIES = [
  { name: "arxiv-lg", url: "http://export.arxiv.org/api/query?search_query=cat:cs.LG&sortBy=submittedDate&max_results=10" },
  { name: "arxiv-cl", url: "http://export.arxiv.org/api/query?search_query=cat:cs.CL&sortBy=submittedDate&max_results=10" },
];

async function fetchRSS(source: string, url: string): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items || []).slice(0, 10).map((item) => ({
      source,
      title: item.title || "Untitled",
      url: item.link || "",
      summary: (item.contentSnippet || item.content || "").slice(0, 300),
      published_at: item.isoDate || new Date().toISOString(),
    }));
  } catch {
    console.warn(`Failed to fetch ${source}: ${url}`);
    return [];
  }
}

async function fetchReddit(): Promise<FeedItem[]> {
  try {
    const res = await fetch("https://www.reddit.com/r/MachineLearning/hot.json?limit=10", {
      headers: { "User-Agent": "Epoch/1.0" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data?.children || [])
      .filter((c: { data: { score: number } }) => c.data.score > 50)
      .slice(0, 10)
      .map((c: { data: { title: string; permalink: string; selftext: string; created_utc: number } }) => ({
        source: "reddit",
        title: c.data.title,
        url: `https://reddit.com${c.data.permalink}`,
        summary: (c.data.selftext || "").slice(0, 300),
        published_at: new Date(c.data.created_utc * 1000).toISOString(),
      }));
  } catch {
    // Reddit is best-effort — silently skip
    return [];
  }
}

export async function fetchAllFeeds(): Promise<FeedItem[]> {
  const results: FeedItem[] = [];

  // Fetch RSS sources in parallel
  const rssPromises = RSS_SOURCES.map((s) => fetchRSS(s.name, s.url));
  const arxivPromises = ARXIV_QUERIES.map((s) => fetchRSS(s.name, s.url));
  const redditPromise = fetchReddit();

  const allResults = await Promise.allSettled([...rssPromises, ...arxivPromises, redditPromise]);

  for (const result of allResults) {
    if (result.status === "fulfilled") {
      results.push(...result.value);
    }
  }

  return results;
}
