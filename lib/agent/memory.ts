import { promises as fs } from "fs";
import path from "path";

// Cross-run memory: lessons distilled from past runs, applied to future ones.
const MEMORY_FILE = path.join(process.cwd(), ".agent-memory.json");

export async function loadLessons(): Promise<string[]> {
  try {
    const raw = await fs.readFile(MEMORY_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.lessons) ? parsed.lessons : [];
  } catch {
    return [];
  }
}

export async function saveLessons(lessons: string[]): Promise<void> {
  try {
    await fs.writeFile(MEMORY_FILE, JSON.stringify({ lessons: lessons.slice(-10) }, null, 2));
  } catch {
    // best-effort; ignore on read-only filesystems
  }
}
