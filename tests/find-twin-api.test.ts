import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";

/** Exercises the same Next handlers used by the browser, with disposable storage. */
test("Find Twin HTTP boundaries, live replay, and authoritative completion", async (t) => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "meaningfulmeet-location-api-"),
  );
  process.env.MEANINGFULMEET_DATA_FILE = path.join(directory, "twins.json");
  process.env.MEANINGFULMEET_LOCATION_DATA_FILE = path.join(
    directory,
    "locations.json",
  );
  const { mutateDatabase, getDatabase } = await import("../src/lib/store");
  const { mutateLocationDatabase, getLocationDatabase } =
    await import("../src/features/find-twin/server/location-store");
  const { locationResponse } =
    await import("../src/features/find-twin/server/http");
  const { locationStreamResponse } =
    await import("../src/features/find-twin/server/location-event-stream");
  const { GET: originalGET } = await import("../src/app/api/[...path]/route");
  const { defaultProfile } = await import("../src/lib/fixtures");
  const eventId = "evt_demo";
  const meetingId = "meeting_http_test";
  const context = (id = meetingId, event = eventId) => ({
    params: Promise.resolve({ eventId: event, meetingId: id }),
  });
  function request(
    userId = "usr_self",
    method = "GET",
    body?: unknown,
    suffix = "rendezvous",
  ) {
    return new NextRequest(
      `http://localhost/api/events/${eventId}/meetings/${meetingId}/${suffix}`,
      {
        method,
        headers: {
          Cookie: `demo_user=${userId}`,
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );
  }
  async function action(
    action: Parameters<typeof locationResponse>[2],
    userId: string,
    body?: unknown,
  ) {
    const method =
      action === "read"
        ? "GET"
        : action === "share"
          ? "PUT"
          : action === "revoke"
            ? "DELETE"
            : "POST";
    return locationResponse(request(userId, method, body), context(), action);
  }
  try {
    await mutateDatabase((db) => {
      db.profiles.usr_01 = {
        ...structuredClone(defaultProfile),
        id: "usr_01",
        name: "Sofia Chen",
      };
      const base = {
        id: meetingId,
        matchId: "match_http_test",
        eventId,
        ownerUserId: "usr_self",
        candidateId: "usr_01",
        requesterAccepted: true,
        recipientAccepted: true,
        status: "accepted" as const,
        createdAt: new Date().toISOString(),
      };
      db.meetings.push(base, {
        ...base,
        id: "meeting_one_sided",
        recipientAccepted: false,
        status: "awaiting_approval",
      });
    });

    await t.test(
      "only participants in a mutually accepted event meeting may read",
      async () => {
        assert.equal((await action("read", "usr_self")).status, 200);
        assert.equal((await action("read", "usr_02")).status, 404);
        assert.equal(
          (
            await locationResponse(
              request(),
              context("meeting_one_sided"),
              "read",
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await locationResponse(
              request(),
              context(meetingId, "other_event"),
              "read",
            )
          ).status,
          404,
        );
        const spoof = new NextRequest(
          `http://localhost/api/events/${eventId}/meetings/${meetingId}/rendezvous?viewerUserId=usr_self`,
          { headers: { Cookie: "demo_user=usr_02" } },
        );
        assert.equal(
          (await locationResponse(spoof, context(), "read")).status,
          404,
        );
        assert.equal(
          (
            await action("share", "usr_self", {
              zoneId: "entrance",
              shareMinutes: 15,
              userId: "usr_01",
            })
          ).status,
          400,
        );
      },
    );

    await t.test(
      "zone proposals require the other person and a current version",
      async () => {
        const proposed = await action("propose", "usr_self", {
          zoneId: "coffee_bar",
          proposalVersion: 0,
        });
        assert.equal(proposed.status, 200);
        const view = await proposed.json();
        assert.equal(view.spot.status, "proposed");
        assert.equal(view.spot.proposalVersion, 1);
        assert.equal(
          (
            await action("respond", "usr_self", {
              proposalVersion: 1,
              decision: "accept",
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await action("propose", "usr_01", {
              zoneId: "quiet_corner",
              proposalVersion: 0,
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await action("respond", "usr_01", {
              proposalVersion: 9,
              decision: "accept",
            })
          ).status,
          409,
        );
        const accepted = await action("respond", "usr_01", {
          proposalVersion: 1,
          decision: "accept",
        });
        assert.equal(accepted.status, 200);
        assert.equal((await accepted.json()).spot.status, "confirmed");
      },
    );

    await t.test(
      "check-ins are bounded, revocable, and absent from upstream public state",
      async () => {
        assert.equal(
          (
            await action("share", "usr_self", {
              zoneId: "entrance",
              shareMinutes: 16,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await action("share", "usr_self", {
              zoneId: "unlisted_room",
              shareMinutes: 15,
            })
          ).status,
          400,
        );
        const shared = await action("share", "usr_self", {
          zoneId: "entrance",
          shareMinutes: 15,
        });
        assert.equal(shared.status, 200);
        const counterpartView = await (await action("read", "usr_01")).json();
        assert.equal(counterpartView.counterpart.checkIn.zoneId, "entrance");
        assert.equal(
          counterpartView.counterpart.checkIn.source,
          "self_reported",
        );
        assert.ok(
          Date.parse(counterpartView.counterpart.checkIn.expiresAt) -
            Date.now() <=
            15 * 60000,
        );
        const publicState = await originalGET(
          new NextRequest("http://localhost/api/demo/state"),
          { params: Promise.resolve({ path: ["demo", "state"] }) },
        );
        assert.ok(
          !JSON.stringify(await publicState.json()).includes("self_reported"),
        );
        assert.equal((await action("revoke", "usr_self")).status, 200);
        assert.equal(
          (await (await action("read", "usr_01")).json()).counterpart.checkIn,
          null,
        );
        await action("share", "usr_self", {
          zoneId: "entrance",
          shareMinutes: 1,
        });
        await mutateLocationDatabase((db) => {
          db.meetings[meetingId].checkIns.usr_self.expiresAt = new Date(
            Date.now() - 1000,
          ).toISOString();
        });
        assert.equal(
          (await (await action("read", "usr_01")).json()).counterpart.checkIn,
          null,
        );
      },
    );

    await t.test(
      "reconnected SSE is scoped and never replays a historical location zone",
      async () => {
        const denied = await locationStreamResponse(
          request("usr_02"),
          context(),
        );
        assert.equal(denied.status, 404);
        const res = await locationStreamResponse(request("usr_01"), context());
        assert.equal(res.status, 200);
        assert.equal(res.headers.get("Content-Type"), "text/event-stream");
        const reader = res.body!.getReader();
        const first = await reader.read();
        await reader.cancel();
        const text = new TextDecoder().decode(first.value);
        const events = text
          .split("\n")
          .filter((line) => line.startsWith("data: "))
          .map((line) => JSON.parse(line.slice(6)));
        assert.ok(events.length > 0);
        assert.ok(events.every((event) => event.meeting_id === meetingId));
        assert.ok(
          events
            .filter((event) => event.type === "location.checkin_shared")
            .every((event) => !("zone_id" in event.payload)),
        );
        assert.ok(
          !JSON.stringify(
            (await getLocationDatabase()).meetings[meetingId].events.filter(
              (e) => e.type.startsWith("location.checkin"),
            ),
          ).includes("entrance"),
        );
      },
    );

    await t.test(
      "two independent confirmations complete upstream once and award each person once",
      async () => {
        assert.equal(
          (await action("verify", "usr_self", { confirmed: true })).status,
          409,
        );
        await action("arrive", "usr_self", { arrived: true });
        const first = await action("verify", "usr_self", { confirmed: true });
        assert.equal(first.status, 200);
        assert.equal((await first.json()).verification.bothConfirmed, false);
        assert.equal(
          (await getDatabase()).meetings.find((m) => m.id === meetingId)!
            .status,
          "accepted",
        );
        await action("arrive", "usr_01", { arrived: true });
        const results = await Promise.all([
          action("verify", "usr_01", { confirmed: true }),
          action("verify", "usr_01", { confirmed: true }),
        ]);
        assert.ok(results.every((r) => r.status === 200));
        const final = await (await action("read", "usr_self")).json();
        assert.equal(final.meetingStatus, "completed");
        assert.equal(final.verification.bothConfirmed, true);
        assert.equal(final.rewards.points, 50);
        assert.equal(final.self.checkIn, null);
        assert.equal(final.counterpart.checkIn, null);
        assert.equal(
          (await (await action("read", "usr_01")).json()).rewards.points,
          50,
        );
        assert.equal(
          (
            await action("share", "usr_self", {
              zoneId: "entrance",
              shareMinutes: 15,
            })
          ).status,
          409,
        );
        const db = await getDatabase();
        assert.equal(
          db.meetings.find((m) => m.id === meetingId)!.status,
          "completed",
        );
        const completedEvents = db.integrationEvents.filter(
          (e) => e.type === "meeting.completed",
        );
        assert.equal(completedEvents.length, 1);
        assert.equal(completedEvents[0].consentScope, "meeting_metadata_only");
        assert.ok(!JSON.stringify(completedEvents[0]).includes("checkIn"));
        assert.ok(!JSON.stringify(completedEvents[0]).includes("zoneId"));
        const saved = (await getLocationDatabase()).meetings[meetingId];
        assert.equal(Object.keys(saved.awards).length, 2);
        assert.equal(
          saved.events.filter((e) => e.type === "rewards.points_awarded")
            .length,
          2,
        );
        assert.equal(
          saved.events.filter((e) => e.type === "meeting.completed").length,
          1,
        );
      },
    );
    await t.test(
      "event end hides all shared zones and rejects new location writes",
      async () => {
        const id = "meeting_http_ended";
        await mutateDatabase((db) => {
          db.meetings.push({
            id,
            matchId: "match_ended",
            eventId,
            ownerUserId: "usr_self",
            candidateId: "usr_01",
            requesterAccepted: true,
            recipientAccepted: true,
            status: "accepted",
            createdAt: new Date().toISOString(),
          });
        });
        const shared = await locationResponse(
          request("usr_self", "PUT", { zoneId: "entrance", shareMinutes: 15 }),
          context(id),
          "share",
        );
        assert.equal(shared.status, 200);
        const realNow = Date.now;
        Date.now = () => Date.parse("2026-10-28T00:00:00.000Z");
        try {
          const view = await (
            await locationResponse(request("usr_01"), context(id), "read")
          ).json();
          assert.equal(view.eventEnded, true);
          assert.equal(view.counterpart.checkIn, null);
          const denied = await locationResponse(
            request("usr_self", "PUT", {
              zoneId: "entrance",
              shareMinutes: 15,
            }),
            context(id),
            "share",
          );
          assert.equal(denied.status, 410);
        } finally {
          Date.now = realNow;
        }
      },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
