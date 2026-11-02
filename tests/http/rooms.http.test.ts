import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seed } from "../../scripts/seed-data.js";
import { createTestApp, WEEK } from "./setup.js";

const { app, pool } = createTestApp();
beforeEach(async () => { await seed(pool); });
afterAll(async () => { await app.close(); await pool.end(); });

describe("GET /rooms", () => {
  it("renvoie les 4 salles, room-4 avec sa maintenance", async () => {
    const res = await app.inject({ method: "GET", url: "/rooms" });
    expect(res.statusCode).toBe(200);
    const rooms = res.json();
    expect(rooms.map((r: { id: string }) => r.id)).toEqual(["room-1", "room-2", "room-3", "room-4"]);
    expect(rooms[3].maintenance).toEqual({ start: "2026-11-05T00:00:00Z", end: "2026-11-08T00:00:00Z" });
  });
});

describe("GET /rooms/:id/bookings", () => {
  it("renvoie le planning de la semaine de room-1", async () => {
    const res = await app.inject({ method: "GET", url: `/rooms/room-1/bookings?${WEEK}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([{
      id: "booking-1", roomId: "room-1", memberId: "member-1",
      start: "2026-11-03T18:00:00Z", end: "2026-11-03T20:00:00Z", status: "confirmed",
    }]);
  });

  it("n'inclut pas les réservations hors de la période (booking-4)", async () => {
    const res = await app.inject({ method: "GET", url: `/rooms/room-2/bookings?${WEEK}` });
    expect(res.json().map((b: { id: string }) => b.id)).toEqual(["booking-3"]);
  });

  it("404 pour une salle inconnue", async () => {
    const res = await app.inject({ method: "GET", url: `/rooms/room-99/bookings?${WEEK}` });
    expect(res.statusCode).toBe(404);
  });

  it("400 si from ou to est absent", async () => {
    const res = await app.inject({ method: "GET", url: "/rooms/room-1/bookings" });
    expect(res.statusCode).toBe(400);
  });
});
