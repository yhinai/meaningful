import {
  mkdir,
  readFile,
  writeFile,
  rename,
  unlink,
  readdir,
} from "node:fs/promises";
import path from "node:path";
import type { Edition } from "./model";
const directory = () => path.join(process.cwd(), ".data", "omi-magazine");
export async function saveEdition(edition: Edition) {
  await mkdir(directory(), { recursive: true, mode: 0o700 });
  const target = path.join(directory(), `${edition.id}.json`);
  const temporary = `${target}.tmp`;
  await writeFile(temporary, JSON.stringify(edition), { mode: 0o600 });
  await rename(temporary, target);
}
export async function loadEdition(id: string): Promise<Edition> {
  return JSON.parse(
    await readFile(path.join(directory(), `${id}.json`), "utf8"),
  );
}
export async function removeEdition(id: string) {
  await unlink(path.join(directory(), `${id}.json`));
}

export async function listEditions() {
  let names: string[];
  try {
    names = await readdir(directory());
  } catch {
    return [];
  }
  const editions = await Promise.all(
    names
      .filter((name) => /^[a-f0-9-]{36}\.json$/.test(name))
      .slice(-100)
      .map(async (name) => {
        try {
          const edition = await loadEdition(name.slice(0, -5));
          return {
            id: edition.id,
            createdAt: edition.createdAt,
            source: edition.source,
            graphStatus: edition.graphStatus,
          };
        } catch {
          return null;
        }
      }),
  );
  return editions
    .filter((edition) => edition !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
