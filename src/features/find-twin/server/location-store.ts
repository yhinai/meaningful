import { promises as fs } from "node:fs";
import path from "node:path";
import type { LocationDatabase } from "../types";
let queue: Promise<unknown> = Promise.resolve();
function filename() {
  return (
    process.env.MEANINGFULMEET_LOCATION_DATA_FILE ||
    path.join(process.cwd(), ".data", "find-twin.json")
  );
}
function fresh(): LocationDatabase {
  return { version: 1, meetings: {}, auditLogs: [] };
}
async function read(): Promise<LocationDatabase> {
  try {
    return JSON.parse(
      await fs.readFile(/* turbopackIgnore: true */ filename(), "utf8"),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return fresh();
  }
}
export async function getLocationDatabase() {
  await queue;
  return read();
}
export function mutateLocationDatabase<T>(
  fn: (database: LocationDatabase) => T | Promise<T>,
): Promise<T> {
  const work = queue.then(async () => {
    const database = await read();
    const result = await fn(database);
    const file = filename();
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(`${file}.tmp`, JSON.stringify(database, null, 2));
    await fs.rename(`${file}.tmp`, file);
    return result;
  });
  queue = work.catch(() => {});
  return work;
}
