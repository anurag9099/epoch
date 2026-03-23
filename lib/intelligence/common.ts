import fs from "fs";
import path from "path";
import { get } from "../db";

const taxonomy = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data", "topic-taxonomy.json"), "utf-8")
);

export const topicMap = new Map<string, { phase: number }>();
for (const topic of taxonomy.topics as Array<{ id: string; phase: number }>) {
  topicMap.set(topic.id, { phase: topic.phase });
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function toDateOnly(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(from: string | null | undefined, to = new Date()) {
  if (!from) return null;
  const start = new Date(from);
  if (!Number.isFinite(start.getTime())) return null;
  return Math.max(0, Math.floor((to.getTime() - start.getTime()) / 86400000));
}

export function confidenceFromScore(score: number, floor = 0.35, ceiling = 0.95) {
  return clamp(score, floor, ceiling);
}

export function parseTaskId(topic: string) {
  if (!topic.startsWith("task_")) return null;
  const taskId = Number(topic.slice(5));
  return Number.isFinite(taskId) ? taskId : null;
}

export async function getCurrentDay() {
  const firstLog = await get("SELECT MIN(date) as d FROM daily_log");
  if (!firstLog?.d) return 1;
  return Math.min(
    Math.floor((Date.now() - new Date(firstLog.d as string).getTime()) / 86400000) + 1,
    42
  );
}
