import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { AdaptiveTuning, HeraState } from "@/lib/types";

interface HeraDB extends DBSchema {
  state: { key: "state"; value: HeraState };
  tuning: { key: "tuning"; value: AdaptiveTuning };
  meta: { key: "meta"; value: { id: "meta"; updatedAt: string } };
}

let _db: IDBPDatabase<HeraDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<HeraDB>> {
  if (_db) return _db;
  _db = await openDB<HeraDB>("hera_cycle", 3, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("state")) db.createObjectStore("state");
      if (!db.objectStoreNames.contains("tuning")) db.createObjectStore("tuning");
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
    }
  });
  return _db;
}

export async function readState(): Promise<HeraState | null> {
  const db = await getDB();
  return (await db.get("state", "state")) ?? null;
}

export async function writeState(state: HeraState): Promise<void> {
  const db = await getDB();
  await db.put("state", state, "state");
  await db.put("meta", { id: "meta", updatedAt: new Date().toISOString() }, "meta");
}

export async function readTuning(): Promise<AdaptiveTuning | null> {
  const db = await getDB();
  return (await db.get("tuning", "tuning")) ?? null;
}

export async function writeTuning(tuning: AdaptiveTuning): Promise<void> {
  const db = await getDB();
  await db.put("tuning", tuning, "tuning");
  await db.put("meta", { id: "meta", updatedAt: new Date().toISOString() }, "meta");
}
