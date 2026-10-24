export const TWIN_STYLES = [
  {
    id: "cloud",
    label: "Cloud",
    color: "Lavender",
    description: "Leaf-shaped ears",
    body: "#bba6ee",
    dark: "#9d83dc",
    light: "#e9dffc",
  },
  {
    id: "bunny",
    label: "Bunny",
    color: "Peach",
    description: "Long, rounded ears",
    body: "#f3b497",
    dark: "#e79c7c",
    light: "#ffdfd0",
  },
  {
    id: "cat",
    label: "Cat",
    color: "Sky",
    description: "Short ears and whiskers",
    body: "#96c9e9",
    dark: "#77b6dc",
    light: "#dbf1ff",
  },
  {
    id: "fox",
    label: "Fox",
    color: "Mint",
    description: "Tall ears and a soft tail",
    body: "#91cfc0",
    dark: "#72b5a5",
    light: "#d5f2e8",
  },
  {
    id: "bear",
    label: "Bear",
    color: "Honey",
    description: "Round ears, warm heart",
    body: "#e6c58f",
    dark: "#cda76b",
    light: "#f9e9cb",
  },
  {
    id: "owl",
    label: "Owl",
    color: "Rose",
    description: "Little tufts, curious eyes",
    body: "#dfa9be",
    dark: "#c98ca6",
    light: "#f7dfe9",
  },
] as const;
export type TwinStyleId = (typeof TWIN_STYLES)[number]["id"];
export function isTwinStyle(value: unknown): value is TwinStyleId {
  return TWIN_STYLES.some((style) => style.id === value);
}
export function twinStyleForPerson(personId?: string): TwinStyleId {
  if (!personId || personId === "usr_self") return "cloud";
  let hash = 0;
  for (const char of personId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TWIN_STYLES[hash % TWIN_STYLES.length].id;
}
