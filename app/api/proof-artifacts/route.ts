import { NextRequest, NextResponse } from "next/server";
import {
  getProofArtifactDraft,
  listProofArtifacts,
  saveProofArtifact,
} from "@/lib/artifacts";

export async function GET(req: NextRequest) {
  const fieldId = req.nextUrl.searchParams.get("fieldId");
  const taskId = req.nextUrl.searchParams.get("taskId");

  if (fieldId) {
    const artifact = await getProofArtifactDraft(Number(fieldId));
    return NextResponse.json({ artifact });
  }

  const artifacts = await listProofArtifacts(taskId ? Number(taskId) : undefined);
  return NextResponse.json({ artifacts });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!body.fieldId || !body.title || !body.proofStatement || !body.status) {
    return NextResponse.json(
      { error: "fieldId, title, proofStatement, and status are required" },
      { status: 400 }
    );
  }

  const artifact = await saveProofArtifact({
    fieldId: Number(body.fieldId),
    title: body.title,
    proofStatement: body.proofStatement,
    explanation: body.explanation ?? null,
    evidenceSummary: body.evidenceSummary ?? null,
    repoUrl: body.repoUrl ?? null,
    artifactUrl: body.artifactUrl ?? null,
    status: body.status,
  });

  if (!artifact) {
    return NextResponse.json(
      { error: "Capture a measurable result before finalizing proof." },
      { status: 400 }
    );
  }

  return NextResponse.json({ artifact });
}
