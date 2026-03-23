import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { SCHEMA_SQL } from "./schema";

const DB_PATH = path.join(process.cwd(), "db", "epoch.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    _db.exec(SCHEMA_SQL);
  }
  return _db;
}

export type Row = Record<string, unknown>;

export async function query(sql: string, params: unknown[] = []): Promise<Row[]> {
  const db = getDb();
  return db.prepare(sql).all(...params) as Row[];
}

export async function execute(sql: string, params: unknown[] = []): Promise<void> {
  const db = getDb();
  db.prepare(sql).run(...params);
}

export async function get(sql: string, params: unknown[] = []): Promise<Row | null> {
  const db = getDb();
  return (db.prepare(sql).get(...params) as Row) ?? null;
}

export async function execRaw(sql: string): Promise<void> {
  const db = getDb();
  db.exec(sql);
}
