import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seed } from "../../scripts/seed-data.js";
import { createTestApp } from "./setup.js";

const { app, pool } = createTestApp();
beforeEach(async () => { await seed(pool); });
afterAll(async () => { await app.close(); await pool.end(); });

describe("GET /members/:id/bookings", () => {
  it("renvoie les réservations de member-1", async () => {
    const res = await app.inject({ method: "GET", url: "/members/member-1/bookings" });
    expect(res.statusCode).toBe(200);
    expect(res.json().map((b: { id: string }) => b.id)).toEqual(["booking-1", "booking-2"]);
  });

  it("404 pour un membre inconnu", async () => {
    const res = await app.inject({ method: "GET", url: "/members/member-99/bookings" });
    expect(res.statusCode).toBe(404);
  });
});
