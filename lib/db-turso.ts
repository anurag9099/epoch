import { createClient, type Client } from "@libsql/client";

let _client: Client | null = null;

function getClient(): Client {
  if (!_client) {
    const url = process.env.TURSO_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) {
      throw new Error("TURSO_URL and TURSO_AUTH_TOKEN must be set");
    }
    _client = createClient({ url, authToken });
  }
  return _client;
}

export type Row = Record<string, unknown>;

export async function query(sql: string, params: unknown[] = []): Promise<Row[]> {
  const client = getClient();
  const result = await client.execute({ sql, args: params as unknown as import("@libsql/client").InArgs });
  return result.rows as unknown as Row[];
}

export async function execute(sql: string, params: unknown[] = []): Promise<void> {
  const client = getClient();
  await client.execute({ sql, args: params as unknown as import("@libsql/client").InArgs });
}

export async function get(sql: string, params: unknown[] = []): Promise<Row | null> {
  const client = getClient();
  const result = await client.execute({ sql, args: params as unknown as import("@libsql/client").InArgs });
  return (result.rows[0] as unknown as Row) ?? null;
}

export async function execRaw(sql: string): Promise<void> {
  const client = getClient();
  const statements = sql.split(";").filter((s) => s.trim().length > 0);
  for (const stmt of statements) {
    await client.execute(stmt);
  }
}
