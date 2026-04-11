/**
 * Simple JSON file-based storage for sequences & approvals.
 * Data persists across server restarts in /data/*.json
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch {
    // already exists
  }
}

export async function readStore<T>(filename: string, fallback: T[] = []): Promise<T[]> {
  await ensureDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T[];
  } catch {
    // File doesn't exist yet → return empty
    return fallback;
  }
}

export async function writeStore<T>(filename: string, data: T[]): Promise<void> {
  await ensureDir();
  const filePath = path.join(DATA_DIR, filename);
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}
