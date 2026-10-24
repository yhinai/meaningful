import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("Find Twin service integrity, privacy, and authoritative completion", async (t) => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "meaningfulmeet-find-test-"),
  );
  process.env.MEANINGFULMEET_DATA_FILE = path.join(directory, "core.json");
  process.env.MEANINGFULMEET_LOCATION_DATA_FILE = path.join(
    directory,
    "location.json",
  );
  const { mutateDatabase, getDatabase } = await import("../src/lib/store");
  const { meetingAdapter } =
    await import("../src/features/find-twin/adapters/meeting-adapter");
  const { mutateLocationDatabase, getLocationDatabase } =
    await import("../src/features/find-twin/server/location-store");
  const service =
    await import("../src/features/find-twin/server/rendezvous-service");
  const { authorizeMeeting } =
    await import("../src/features/find-twin/server/authorization");
  const { NextRequest } = await import("next/server");
  async function seed(
    id: string,
    status: "accepted" | "awaiting_approval" | "completed" = "accepted",
  ) {
    await mutateDatabase((db) => {
      db.meetings.push({
        id,
        eventId: "evt_demo",
        matchId: `match_${id}`,
        ownerUserId: "usr_self",
        candidateId: "usr_01",
        requesterAccepted: true,
        recipientAccepted: status !== "awaiting_approval",
        status,
        createdAt: new Date().toISOString(),
      });
    });
    return id;
  }
  async function context(id: string, viewerUserId = "usr_self") {
    return {
      viewerUserId,
      meeting: await meetingAdapter.getAcceptedMeeting(
        "evt_demo",
        id,
        viewerUserId,
      ),
    };
  }
  async function agree(id: string) {
    await service.proposeSpot(await context(id), "coffee_bar", 0);
    await service.respondToSpot(await context(id, "usr_01"), 1, "accept");
  }
  try {
    await t.test(
      "only mutually accepted meeting participants may enter",
      async () => {
        const id = await seed("pending", "awaiting_approval");
        await assert.rejects(context(id), /Both people must approve/);
        const accepted = await seed("guard");
        await assert.rejects(context(accepted, "usr_02"), /not available/);
        await assert.rejects(
          meetingAdapter.getAcceptedMeeting(
            "other_event",
            accepted,
            "usr_self",
          ),
          /not available/,
        );
      },
    );
    await t.test(
      "optimistic proposals prevent two people silently choosing different spots",
      async () => {
        const id = await seed("proposal");
        const a = await context(id);
        const b = await context(id, "usr_01");
        const results = await Promise.allSettled([
          service.proposeSpot(a, "coffee_bar", 0),
          service.proposeSpot(b, "quiet_corner", 0),
        ]);
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
        const view = await service.readRendezvous(a);
        assert.equal(view.spot?.proposalVersion, 1);
        await assert.rejects(
          service.respondToSpot(a, 1, "accept"),
          /other attendee/,
        );
        await assert.rejects(
          service.respondToSpot(b, 2, "accept"),
          /no longer current/,
        );
        const confirmed = await service.respondToSpot(b, 1, "accept");
        assert.equal(confirmed.spot?.status, "confirmed");
        assert.deepEqual(
          (await service.readRendezvous(a)).spot,
          confirmed.spot,
        );
      },
    );
    await t.test(
      "voluntary sharing replaces zones, enforces TTL, revokes immediately, and excludes historical locations from replay",
      async () => {
        const id = await seed("privacy");
        await agree(id);
        const self = await context(id);
        const other = await context(id, "usr_01");
        await assert.rejects(
          async () => service.shareCheckIn(self, "entrance", 16),
          /1 to 15/,
        );
        await assert.rejects(
          async () => service.shareCheckIn(self, "nonexistent", 15),
          /named meeting zone/,
        );
        await service.shareCheckIn(self, "entrance", 15);
        assert.equal(
          (await service.readRendezvous(other)).counterpart.checkIn?.zoneId,
          "entrance",
        );
        await service.shareCheckIn(self, "registration", 1);
        assert.equal(
          (await service.readRendezvous(other)).counterpart.checkIn?.zoneId,
          "registration",
        );
        await service.revokeCheckIn(self);
        assert.equal(
          (await service.readRendezvous(other)).counterpart.checkIn,
          null,
        );
        await service.shareCheckIn(self, "entrance", 15);
        await mutateLocationDatabase((db) => {
          db.meetings[id].checkIns.usr_self.expiresAt = new Date(
            Date.now() - 1000,
          ).toISOString();
        });
        assert.equal(
          (await service.readRendezvous(other)).counterpart.checkIn,
          null,
        );
        const events = (await service.readLocationEvents(other, 0)).events;
        assert.ok(
          events.some((event) => event.type === "location.checkin_expired"),
        );
        const privateEvents = events.filter((event) =>
          event.type.startsWith("location.checkin_"),
        );
        assert.ok(
          privateEvents.every(
            (event) =>
              !("zone_id" in event.payload) && !("zoneId" in event.payload),
          ),
        );
        assert.equal(
          (await service.readLocationEvents(other, events.at(-1)!.seq)).events
            .length,
          0,
        );
      },
    );
    await t.test(
      "mutual verification awards exactly once and stale accepted context cannot revive sharing",
      async () => {
        const id = await seed("complete");
        await agree(id);
        const a = await context(id);
        const b = await context(id, "usr_01");
        await assert.rejects(service.verifyMeeting(a), /Mark yourself here/);
        await service.recordArrival(a, true);
        await service.recordArrival(b, true);
        await service.shareCheckIn(a, "entrance", 15);
        const first = await service.verifyMeeting(a);
        assert.equal(first.verification.bothConfirmed, false);
        assert.equal(first.rewards.points, 0);
        const [second, lateShare] = await Promise.allSettled([
          service.verifyMeeting(b),
          service.shareCheckIn(a, "registration", 15),
        ]);
        assert.equal(second.status, "fulfilled");
        assert.equal(lateShare.status, "rejected");
        const repeated = await Promise.all([
          service.verifyMeeting(a),
          service.verifyMeeting(b),
          service.verifyMeeting(a),
        ]);
        assert.ok(
          repeated.every(
            (view) =>
              view.verification.bothConfirmed &&
              view.rewards.points === 50 &&
              view.self.checkIn === null &&
              view.counterpart.checkIn === null,
          ),
        );
        const core = await getDatabase();
        assert.equal(
          core.meetings.find((m) => m.id === id)?.status,
          "completed",
        );
        const handoff = core.integrationEvents.filter(
          (event) =>
            event.type === "meeting.completed" && event.meetingId === id,
        );
        assert.equal(handoff.length, 1);
        assert.equal(handoff[0].consentScope, "meeting_metadata_only");
        assert.equal(handoff[0].verificationMethod, "mutual_confirm");
        assert.ok(!JSON.stringify(handoff).includes("zoneId"));
        const record = (await getLocationDatabase()).meetings[id];
        assert.equal(Object.keys(record.awards).length, 2);
        assert.equal(
          record.events.filter((e) => e.type === "meeting.completed").length,
          1,
        );
        assert.equal(
          record.events.filter((e) => e.type === "rewards.points_awarded")
            .length,
          2,
        );
        assert.deepEqual(
          record.events.map((event) => event.seq),
          record.events.map((_, i) => i + 1),
        );
      },
    );
    await t.test(
      "legacy single-person completion never produces verification rewards",
      async () => {
        const id = await seed("legacy");
        await agree(id);
        await service.recordArrival(await context(id), true);
        await mutateDatabase((db) => {
          db.meetings.find((m) => m.id === id)!.status = "completed";
        });
        await assert.rejects(
          service.verifyMeeting(await context(id)),
          /already completed outside/,
        );
        assert.equal(
          (await service.readRendezvous(await context(id))).rewards.points,
          0,
        );
      },
    );
    await t.test(
      "withdrawn approval revokes active shares and denies subsequent reads",
      async () => {
        const id = await seed("cancelled");
        const self = await context(id);
        await service.shareCheckIn(self, "entrance", 15);
        await mutateDatabase((db) => {
          const meeting = db.meetings.find((m) => m.id === id)!;
          meeting.status = "declined";
          meeting.recipientAccepted = false;
        });
        await assert.rejects(
          authorizeMeeting(new NextRequest("http://localhost"), "evt_demo", id),
          /Both people must approve/,
        );
        assert.ok(
          (await getLocationDatabase()).meetings[id].checkIns.usr_self
            .revokedAt,
        );
      },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
