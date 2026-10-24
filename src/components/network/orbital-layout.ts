/** Evenly spaced, stable slots: adding a discovery never repositions earlier people. */
export function orbitalPosition(index: number): { x: number; y: number } {
  const capacities = [9, 18, 27, 36, 45];
  const radii = [240, 455, 675, 895, 1115];
  let offset = 0;
  for (let ring = 0; ring < capacities.length; ring++) {
    if (index < offset + capacities[ring]) {
      const angle =
        ((index - offset) / capacities[ring]) * Math.PI * 2 -
        Math.PI / 2 +
        ring * 0.07;
      return {
        x: Math.round(Math.cos(angle) * radii[ring]),
        y: Math.round(Math.sin(angle) * radii[ring] * 0.84),
      };
    }
    offset += capacities[ring];
  }
  const angle = index * 2.399963;
  return {
    x: Math.round(Math.cos(angle) * 1350),
    y: Math.round(Math.sin(angle) * 1135),
  };
}
