import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// ==================== 类型 ====================

export interface Config {
  apiKey: string;
}

// ==================== 路径 ====================

const AIR_DIR = () => join(homedir(), ".ai-zen", "air");
const CONFIG_FILE = () => join(AIR_DIR(), "config.json");
const CONTEXT_FILE = () => join(AIR_DIR(), "context.json");
const SNAPSHOTS_DIR = () => join(AIR_DIR(), "snapshots");

// ==================== 配置（只有 apiKey） ====================

export function ensureDir(): void {
  const d = AIR_DIR();
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

export function readConfig(): Config {
  ensureDir();
  const f = CONFIG_FILE();
  if (!existsSync(f)) {
    writeFileSync(f, JSON.stringify({ apiKey: "" }, null, 2), "utf-8");
    return { apiKey: "" };
  }
  try {
    return { apiKey: JSON.parse(readFileSync(f, "utf-8")).apiKey || "" };
  } catch {
    return { apiKey: "" };
  }
}

export function saveConfig(apiKey: string): void {
  ensureDir();
  writeFileSync(CONFIG_FILE(), JSON.stringify({ apiKey }, null, 2), "utf-8");
}

// ==================== 唯一上下文（就是 messages 数组） ====================

export function readMessages(): any[] {
  ensureDir();
  const f = CONTEXT_FILE();
  if (!existsSync(f)) return [];
  try {
    const data = JSON.parse(readFileSync(f, "utf-8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveMessages(messages: any[]): void {
  ensureDir();
  writeFileSync(CONTEXT_FILE(), JSON.stringify(messages, null, 2), "utf-8");
}

export function clearMessages(): void {
  saveMessages([]);
}

// ==================== 快照（以 ISO 时间命名，存到 snapshots 目录） ====================

export function saveSnapshot(messages: any[]): string {
  ensureDir();
  const d = SNAPSHOTS_DIR();
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  const name = new Date().toISOString().replace(/[:.]/g, "-");
  const file = join(d, `${name}.json`);
  writeFileSync(file, JSON.stringify(messages, null, 2), "utf-8");
  return name;
}

export interface SnapshotInfo {
  name: string;
  date: string;
}

export function listSnapshots(): SnapshotInfo[] {
  const d = SNAPSHOTS_DIR();
  if (!existsSync(d)) return [];
  const files = readdirSync(d).filter((f) => f.endsWith(".json")).sort().reverse();
  return files.map((f) => {
    const name = f.replace(/\.json$/, "");
    const isoStr = name.replace(
      /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/,
      "$1T$2:$3:$4.$5Z"
    );
    const date = new Date(isoStr).toLocaleString("zh-CN");
    return { name, date };
  });
}

export function loadSnapshot(name: string): any[] {
  const d = SNAPSHOTS_DIR();
  const file = join(d, `${name}.json`);
  if (!existsSync(file)) return [];
  try {
    const data = JSON.parse(readFileSync(file, "utf-8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
