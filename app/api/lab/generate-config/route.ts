import { NextRequest, NextResponse } from "next/server";
import { generateLabConfig } from "@/lib/lab-generator";

export async function POST(req: NextRequest) {
  try {
    const { taskId } = await req.json();

    if (!taskId || typeof taskId !== "number") {
      return NextResponse.json(
        { error: "taskId (number) required" },
        { status: 400 }
      );
    }

    const config = await generateLabConfig(taskId);

    if (!config) {
      return NextResponse.json(
        { error: "Failed to generate lab config" },
        { status: 500 }
      );
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Lab config generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const taskId = Number(req.nextUrl.searchParams.get("taskId"));

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId query param required" },
        { status: 400 }
      );
    }

    // Check for existing generated config (don't generate new one on GET)
    const { get } = await import("@/lib/db");
    const existing = await get(
      "SELECT config_json FROM generated_lab_configs WHERE task_id = ?",
      [taskId]
    );

    if (existing) {
      return NextResponse.json({
        config: JSON.parse(existing.config_json as string),
      });
    }

    return NextResponse.json({ config: null });
  } catch (error) {
    console.error("Lab config fetch error:", error);
    return NextResponse.json({ config: null });
  }
}
