import { NextRequest, NextResponse } from "next/server";
import {
  buildArtifactExportBundle,
  getProofArtifactById,
} from "@/lib/artifacts";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const artifact = await getProofArtifactById(Number(id));

  if (!artifact) {
    return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
  }

  const format = req.nextUrl.searchParams.get("format") ?? "text";
  const bundle = buildArtifactExportBundle(artifact);

  if (format === "json") {
    return new Response(JSON.stringify(bundle.data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${bundle.filenameBase}.json"`,
      },
    });
  }

  if (format === "markdown") {
    return new Response(bundle.markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${bundle.filenameBase}.md"`,
      },
    });
  }

  return new Response(bundle.text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${bundle.filenameBase}.txt"`,
    },
  });
}
