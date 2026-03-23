import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const phases = await query(`
    SELECT p.*,
      (SELECT COUNT(*) FROM tasks WHERE phase_id = p.id AND status = 'complete') as completed,
      (SELECT COUNT(*) FROM tasks WHERE phase_id = p.id) as total
    FROM phases p ORDER BY order_num
  `);
  return NextResponse.json(phases);
}
