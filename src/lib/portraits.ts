const portraitIds = [
  47, 12, 44, 11, 49, 13, 45, 14, 48, 15, 46, 16, 43, 17, 41, 18, 40, 19, 39,
  20,
];
export function portraitFor(id: string) {
  const i = Math.max(0, Number(id.replace("usr_", "")) - 1);
  return `https://i.pravatar.cc/150?img=${portraitIds[i % portraitIds.length] ?? 47}`;
}
