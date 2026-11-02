import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seed } from "../../scripts/seed-data.js";
import { createTestApp } from "./setup.js";

const { app, pool } = createTestApp();
beforeEach(async () => { await seed(pool); });
afterAll(async () => { await app.close(); await pool.end(); });

describe("requêtes simultanées", () => {
  it("deux membres, même salle, même créneau : un 201 et un 409", async () => {
    const slot = { start: "2026-11-04T14:00:00Z", end: "2026-11-04T16:00:00Z" };
    const [a, b] = await Promise.all([
      app.inject({ method: "POST", url: "/rooms/room-3/bookings", payload: { memberId: "member-2", ...slot } }),
      app.inject({ method: "POST", url: "/rooms/room-3/bookings", payload: { memberId: "member-3", ...slot } }),
    ]);
    expect([a.statusCode, b.statusCode].sort()).toEqual([201, 409]);
  });
});
