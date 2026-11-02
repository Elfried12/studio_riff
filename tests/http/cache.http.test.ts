import { once } from "node:events";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { createPool } from "../../src/infra/db.js";
import { createValkeyClient } from "../../src/infra/valkey-client.js";
import { SCHEDULE_TTL_SECONDS, ValkeyScheduleCache } from "../../src/infra/valkey-schedule-cache.js";
import { seed } from "../../scripts/seed-data.js";
import { FixedClock } from "../unit/helpers.js";
import { WEEK } from "./setup.js";

const pool = createPool();
const valkey = createValkeyClient();
const app = buildApp({ pool, clock: new FixedClock(), cache: new ValkeyScheduleCache(valkey) });
const planning = () => app.inject({ method: "GET", url: `/rooms/room-1/bookings?${WEEK}` });
const ids = (res: { json(): unknown }) => (res.json() as { id: string }[]).map((b) => b.id);

beforeAll(async () => {
  if (valkey.status !== "ready") await once(valkey, "ready");
});
beforeEach(async () => {
  await seed(pool);
  await valkey.flushdb();
});
afterAll(async () => {
  await app.close();
  await pool.end();
  valkey.disconnect();
});

describe("cache du planning", () => {
  it("enregistre le planning sous une clé versionnée avec une durée de vie", async () => {
    await planning();
    const keys = await valkey.keys("schedule:room-1:v*");
    expect(keys).toHaveLength(1);
    const ttl = await valkey.ttl(keys[0]);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(SCHEDULE_TTL_SECONDS);
  });

  it("la deuxième lecture vient du cache, sans passer par PostgreSQL", async () => {
    await planning();
    // On modifie la base sans passer par l'API : le cache n'est pas prévenu
    await pool.query("DELETE FROM bookings WHERE id = 'booking-1'");
    expect(ids(await planning())).toEqual(["booking-1"]);
  });

  it("une nouvelle réservation apparaît immédiatement", async () => {
    await planning();
    const res = await app.inject({
      method: "POST", url: "/rooms/room-1/bookings",
      payload: { memberId: "member-3", start: "2026-11-04T14:00:00Z", end: "2026-11-04T16:00:00Z" },
    });
    expect(ids(await planning())).toEqual(["booking-1", res.json().id]);
  });

  it("une annulation disparaît immédiatement", async () => {
    await planning();
    await app.inject({ method: "DELETE", url: "/bookings/booking-1" });
    expect(ids(await planning())).toEqual([]);
  });
});

describe("Valkey indisponible", () => {
  it("l'API répond depuis PostgreSQL", async () => {
    const deadValkey = createValkeyClient("redis://127.0.0.1:6390"); // aucun serveur sur ce port
    const degraded = buildApp({
      pool, clock: new FixedClock(), cache: new ValkeyScheduleCache(deadValkey, SCHEDULE_TTL_SECONDS, () => {}),
    });
    try {
      const get = await degraded.inject({ method: "GET", url: `/rooms/room-1/bookings?${WEEK}` });
      expect(get.statusCode).toBe(200);
      expect(ids(get)).toEqual(["booking-1"]);

      const post = await degraded.inject({
        method: "POST", url: "/rooms/room-1/bookings",
        payload: { memberId: "member-3", start: "2026-11-04T14:00:00Z", end: "2026-11-04T16:00:00Z" },
      });
      expect(post.statusCode).toBe(201);

      const del = await degraded.inject({ method: "DELETE", url: "/bookings/booking-1" });
      expect(del.statusCode).toBe(204);
    } finally {
      await degraded.close();
      deadValkey.disconnect();
    }
  });
});
