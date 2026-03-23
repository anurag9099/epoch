import { query } from "@/lib/db";

export interface CanonicalLabRow {
  id: number;
  title: string;
  description: string | null;
  status: string;
  phase_id: number;
  estimated_minutes: number | null;
  order_num: number;
  phase_name: string;
  phase_status: string;
  phase_order: number;
}

function normalizeLabTitle(title: string) {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

function labKey(row: Pick<CanonicalLabRow, "phase_id" | "title">) {
  return `${row.phase_id}:${normalizeLabTitle(row.title)}`;
}

export async function listCanonicalLabs(): Promise<CanonicalLabRow[]> {
  const rows = await query(
    `SELECT t.id, t.title, t.description, t.status, t.phase_id, t.estimated_minutes, t.order_num,
            p.name as phase_name, p.status as phase_status, p.order_num as phase_order
     FROM tasks t
     JOIN phases p ON t.phase_id = p.id
     WHERE t.type = 'lab'
     ORDER BY p.order_num ASC, t.order_num ASC, t.id ASC`
  );

  const seen = new Set<string>();
  const labs: CanonicalLabRow[] = [];

  for (const row of rows) {
    const lab = row as unknown as CanonicalLabRow;
    const key = labKey(lab);
    if (seen.has(key)) continue;
    seen.add(key);
    labs.push(lab);
  }

  return labs;
}

export async function getAdjacentCanonicalLabIds(current: {
  id: number;
  phase_id: number;
  title: string;
}) {
  const labs = await listCanonicalLabs();
  const currentKey = labKey(current);
  let index = labs.findIndex((lab) => lab.id === current.id);

  if (index === -1) {
    index = labs.findIndex((lab) => labKey(lab) === currentKey);
  }

  return {
    prevTaskId: index > 0 ? labs[index - 1]?.id ?? null : null,
    nextTaskId: index >= 0 ? labs[index + 1]?.id ?? null : null,
  };
}
