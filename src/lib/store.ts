import { promises as fs } from "node:fs";
import path from "node:path";
import { defaultGoals, defaultProfile } from "./fixtures";
import type { Database } from "./types";
const file =
  process.env.MEANINGFULMEET_DATA_FILE ||
  path.join(process.cwd(), ".data", "demo.json");
let queue: Promise<unknown> = Promise.resolve();
function fresh(): Database {
  return {
    profiles: { usr_self: structuredClone(defaultProfile) },
    goals: { usr_self: structuredClone(defaultGoals) },
    runs: [],
    matches: [],
    meetings: [],
    integrationEvents: [],
  };
}
async function read(): Promise<Database> {
  try {
    return JSON.parse(await fs.readFile(/* turbopackIgnore: true */ file, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return fresh();
  }
}
export async function getDatabase() {
  await queue;
  return read();
}
export function mutateDatabase<T>(
  fn: (db: Database) => T | Promise<T>,
): Promise<T> {
  const work = queue.then(async () => {
    const db = await read();
    const result = await fn(db);
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(db, null, 2));
    await fs.rename(temporary, file);
    return result;
  });
  queue = work.catch(() => {});
  return work;
}
export async function resetDatabase() {
  return mutateDatabase((db) => Object.assign(db, fresh()));
}
