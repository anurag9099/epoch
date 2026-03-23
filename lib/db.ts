export type Row = Record<string, unknown>;

let _mod: typeof import("./db-local") | typeof import("./db-turso") | null = null;

async function getModule() {
  if (!_mod) {
    if (process.env.TURSO_URL) {
      _mod = await import("./db-turso");
    } else {
      _mod = await import("./db-local");
    }
  }
  return _mod;
}

export async function query(sql: string, params: unknown[] = []): Promise<Row[]> {
  const mod = await getModule();
  return mod.query(sql, params);
}

export async function execute(sql: string, params: unknown[] = []): Promise<void> {
  const mod = await getModule();
  return mod.execute(sql, params);
}

export async function get(sql: string, params: unknown[] = []): Promise<Row | null> {
  const mod = await getModule();
  return mod.get(sql, params);
}

export async function execRaw(sql: string): Promise<void> {
  const mod = await getModule();
  return mod.execRaw(sql);
}
