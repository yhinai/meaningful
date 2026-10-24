import test from "node:test";
import assert from "node:assert/strict";
import { demoVenue } from "../src/features/find-twin/venue/venue";
import { shortestPath } from "../src/features/find-twin/routing/shortest-path";

test("Find Twin corridor route goes through configured hallways, never directly through rooms", () => {
  const route = shortestPath(demoVenue, "entrance", "coffee_bar");
  assert.equal(route.status, "available");
  assert.deepEqual(route.zoneIds, [
    "entrance",
    "hall_center",
    "hall_east",
    "coffee_bar",
  ]);
  assert.deepEqual(route.points, [
    { x: 500, y: 680 },
    { x: 500, y: 360 },
    { x: 760, y: 360 },
    { x: 760, y: 540 },
  ]);
  for (let i = 1; i < route.points.length; i++)
    assert.ok(
      route.points[i - 1].x === route.points[i].x ||
        route.points[i - 1].y === route.points[i].y,
    );
});

test("Find Twin unknown start gives landmark guidance without inventing a route", () => {
  const route = shortestPath(demoVenue, undefined, "coffee_bar");
  assert.equal(route.status, "unknown_start");
  assert.deepEqual(route.points, []);
  assert.match(route.directions.join(" "), /Coffee Bar/);
  assert.doesNotMatch(
    route.directions.join(" "),
    /\d+\s*(meters|minutes|metres|miles)/,
  );
});

test("Find Twin does not draw routes to disconnected zones or unconnected floors", () => {
  const disconnected = { ...demoVenue, paths: [] };
  assert.equal(
    shortestPath(disconnected, "entrance", "coffee_bar").status,
    "unavailable",
  );
  const upstairs = {
    ...demoVenue,
    zones: demoVenue.zones.map((zone) =>
      zone.id === "coffee_bar" ? { ...zone, floorId: "upper" } : zone,
    ),
  };
  assert.equal(
    shortestPath(upstairs, "entrance", "coffee_bar").status,
    "unavailable",
  );
});

test("Find Twin all six public landmarks have a corridor route to every other landmark", () => {
  const landmarks = demoVenue.zones.filter((zone) => zone.isMeetingSpot);
  assert.equal(landmarks.length, 6);
  for (const from of landmarks)
    for (const to of landmarks) {
      const route = shortestPath(demoVenue, from.id, to.id);
      assert.equal(route.status, "available");
      assert.equal(route.zoneIds[0], from.id);
      assert.equal(route.zoneIds.at(-1), to.id);
    }
});
