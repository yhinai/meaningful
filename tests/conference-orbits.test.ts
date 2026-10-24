import test from "node:test";
import assert from "node:assert/strict";
import { orbitalPosition } from "../src/components/network/orbital-layout";

test("a hundred attendees have unique stable positions across growing scouts", () => {
  const positions = Array.from({ length: 100 }, (_, index) =>
    orbitalPosition(index),
  );
  assert.equal(new Set(positions.map(({ x, y }) => `${x},${y}`)).size, 100);
  assert.deepEqual(
    positions.slice(0, 9),
    Array.from({ length: 9 }, (_, index) => orbitalPosition(index)),
  );
  assert.ok(
    positions.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)),
  );
  for (let a = 0; a < positions.length; a++)
    for (let b = a + 1; b < positions.length; b++)
      assert.ok(
        Math.hypot(
          positions[a].x - positions[b].x,
          positions[a].y - positions[b].y,
        ) > 100,
      );
});
