import fs from "fs";
import path from "path";

type Task = {
  id: number;
  type: string;
  title: string;
  content_url: string | null;
};

type Resource = {
  topic: string;
  title: string;
  url: string;
  type: string;
};

type ValidationStatus = "ok" | "broken" | "placeholder";

type ValidationResult = {
  origin: "task" | "resource";
  id: number | string;
  title: string;
  url: string;
  status: ValidationStatus;
  detail: string;
  httpStatus?: number;
};

const dataDir = path.join(__dirname, "..", "data");

function loadJSON<T>(filename: string): T {
  return JSON.parse(fs.readFileSync(path.join(dataDir, filename), "utf8")) as T;
}

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

async function validateUrl(url: string): Promise<{ status: ValidationStatus; detail: string; httpStatus?: number }> {
  if (url.includes("youtube.com/results?search_query=")) {
    return {
      status: "placeholder",
      detail: "YouTube search results page; not a canonical learning resource.",
    };
  }

  if (/youtube\.com\/watch|youtu\.be\//.test(url)) {
    const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    try {
      const res = await fetch(oembed, { signal: withTimeout(12000) });
      return res.ok
        ? { status: "ok", detail: "Embeddable YouTube video", httpStatus: res.status }
        : { status: "broken", detail: "YouTube video unavailable or removed", httpStatus: res.status };
    } catch (error) {
      return { status: "broken", detail: `YouTube validation failed: ${(error as Error).message}` };
    }
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: withTimeout(12000),
      headers: {
        "user-agent": "Epoch content validator",
      },
    });

    return res.ok
      ? { status: "ok", detail: "Reachable resource", httpStatus: res.status }
      : { status: "broken", detail: "Returned an error status", httpStatus: res.status };
  } catch (error) {
    return { status: "broken", detail: `Request failed: ${(error as Error).message}` };
  }
}

async function main() {
  const tasks = loadJSON<Task[]>("tasks.json");
  const resources = loadJSON<Resource[]>("curated-resources.json");

  const entries: Array<{ origin: "task" | "resource"; id: number | string; title: string; url: string }> = [
    ...tasks.filter((task) => task.content_url).map((task) => ({
      origin: "task" as const,
      id: task.id,
      title: task.title,
      url: task.content_url as string,
    })),
    ...resources.map((resource) => ({
      origin: "resource" as const,
      id: resource.topic,
      title: resource.title,
      url: resource.url,
    })),
  ];

  const uniqueEntries = Array.from(
    new Map(entries.map((entry) => [`${entry.origin}:${entry.id}:${entry.url}`, entry])).values()
  );

  const results: ValidationResult[] = [];
  for (const entry of uniqueEntries) {
    const validation = await validateUrl(entry.url);
    results.push({ ...entry, ...validation });
  }

  const summary = {
    total: results.length,
    ok: results.filter((result) => result.status === "ok").length,
    broken: results.filter((result) => result.status === "broken").length,
    placeholders: results.filter((result) => result.status === "placeholder").length,
  };

  console.log(JSON.stringify(summary, null, 2));

  const brokenOrPlaceholder = results.filter((result) => result.status !== "ok");
  if (brokenOrPlaceholder.length > 0) {
    console.log("\nProblematic content:");
    for (const result of brokenOrPlaceholder) {
      console.log(
        `${result.status.toUpperCase()}\t${result.origin}\t${result.id}\t${result.title}\t${result.url}\t${result.detail}${result.httpStatus ? ` (${result.httpStatus})` : ""}`
      );
    }
  }
}

void main();
