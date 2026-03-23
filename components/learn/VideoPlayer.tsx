"use client";

import Link from "next/link";

interface VideoPlayerProps {
  contentUrl: string;
}

type ResolvedContent =
  | { kind: "video"; embedUrl: string; openUrl: string }
  | { kind: "playlist"; embedUrl: string; openUrl: string }
  | { kind: "external"; openUrl: string; note: string };

function resolveContent(url: string): ResolvedContent | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      const videoId = parsed.pathname.split("/").filter(Boolean)[0];
      if (videoId && videoId.length === 11) {
        return {
          kind: "video",
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          openUrl: url,
        };
      }
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      const videoId = parsed.searchParams.get("v");
      if (videoId && videoId.length === 11) {
        return {
          kind: "video",
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          openUrl: url,
        };
      }

      const playlistId = parsed.searchParams.get("list");
      if (parsed.pathname === "/playlist" && playlistId) {
        return {
          kind: "playlist",
          embedUrl: `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(playlistId)}`,
          openUrl: url,
        };
      }

      if (parsed.pathname === "/results") {
        return {
          kind: "external",
          openUrl: url,
          note: "This task currently points to a YouTube search results page, which is unstable and not embeddable. Open it in a new tab while the curriculum is being tightened to a canonical source.",
        };
      }
    }

    return {
      kind: "external",
      openUrl: url,
      note: "This resource is not embeddable in Epoch yet. Open it in a new tab and continue the mission here.",
    };
  } catch {
    return null;
  }
}

export function VideoPlayer({ contentUrl }: VideoPlayerProps) {
  const content = resolveContent(contentUrl);

  if (!content) {
    return (
      <div
        className="w-full flex items-center justify-center rounded-lg"
        style={{ maxHeight: "52vh", background: "var(--bg-video)", aspectRatio: "16/9" }}
      >
        <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-hint)" }}>
          Invalid video URL
        </p>
      </div>
    );
  }

  if (content.kind === "external") {
    return (
      <div
        className="w-full rounded-lg border"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
          padding: 18,
        }}
      >
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--text-ink)" }}>
          Open resource
        </div>
        <p
          style={{
            marginTop: 8,
            fontFamily: "var(--font-body)",
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--text-muted)",
          }}
        >
          {content.note}
        </p>
        <div className="mt-4">
          <Link
            href={content.openUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-md bg-teal px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--teal-hover)]"
          >
            Open in new tab
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        maxHeight: "52vh",
        overflow: "hidden",
        flexShrink: 0,
        background: "#1a1510",
        borderRadius: 8,
      }}
    >
      <iframe
        src={content.embedUrl}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        style={{
          maxWidth: "100%",
          maxHeight: "52vh",
          width: "100%",
          height: "auto",
          aspectRatio: "16/9",
          display: "block",
        }}
      />
    </div>
  );
}
