import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seed } from "../../scripts/seed-data.js";
import { createTestApp, WEEK } from "./setup.js";

const { app, pool } = createTestApp();
beforeEach(async () => { await seed(pool); });
afterAll(async () => { await app.close(); await pool.end(); });

const post = (roomId: string, payload: unknown) =>
  app.inject({ method: "POST", url: `/rooms/${roomId}/bookings`, payload: payload as object });

const valid = { memberId: "member-3", start: "2026-11-04T14:00:00Z", end: "2026-11-04T16:00:00Z" };

describe("POST /rooms/:id/bookings", () => {
  it("201, Location et réservation au format du sujet", async () => {
    const res = await post("room-1", valid);
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toEqual({ id: expect.any(String), roomId: "room-1", ...valid, status: "confirmed" });
    expect(res.headers.location).toBe(`/bookings/${body.id}`);

    const get = await app.inject({ method: "GET", url: res.headers.location as string });
    expect(get.statusCode).toBe(200);
    expect(get.json()).toEqual(body);
  });

  it("201 pour un créneau qui commence à la fin de booking-1", async () => {
    const res = await post("room-1", { memberId: "member-3", start: "2026-11-03T20:00:00Z", end: "2026-11-03T22:00:00Z" });
    expect(res.statusCode).toBe(201);
  });

  it("409 si le créneau chevauche booking-1", async () => {
    const res = await post("room-1", { memberId: "member-3", start: "2026-11-03T19:00:00Z", end: "2026-11-03T21:00:00Z" });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("SLOT_TAKEN");
  });

  it("409 si member-1 a déjà 2 réservations à venir", async () => {
    const res = await post("room-1", { ...valid, memberId: "member-1" });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("MEMBER_LIMIT_REACHED");
  });

  it("409 si room-4 est en maintenance", async () => {
    const res = await post("room-4", { memberId: "member-3", start: "2026-11-06T14:00:00Z", end: "2026-11-06T16:00:00Z" });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("ROOM_UNDER_MAINTENANCE");
  });

  it("400 pour une durée de 5 h, un champ manquant ou un JSON mal formé", async () => {
    expect((await post("room-1", { ...valid, end: "2026-11-04T19:00:00Z" })).statusCode).toBe(400);
    expect((await post("room-1", { start: valid.start, end: valid.end })).statusCode).toBe(400);
    const bad = await app.inject({
      method: "POST", url: "/rooms/room-1/bookings",
      headers: { "content-type": "application/json" }, payload: "{pas du json",
    });
    expect(bad.statusCode).toBe(400);
  });

  it("404 pour une salle ou un membre inconnu", async () => {
    expect((await post("room-99", valid)).statusCode).toBe(404);
    expect((await post("room-1", { ...valid, memberId: "member-99" })).statusCode).toBe(404);
  });
});

describe("GET /bookings/:id", () => {
  it("200 pour booking-1, 404 pour un identifiant inconnu", async () => {
    expect((await app.inject({ method: "GET", url: "/bookings/booking-1" })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/bookings/nope" })).statusCode).toBe(404);
  });
});

describe("DELETE /bookings/:id", () => {
  it("204 et statut cancelled pour booking-1 (plus de 24 h avant)", async () => {
    const res = await app.inject({ method: "DELETE", url: "/bookings/booking-1" });
    expect(res.statusCode).toBe(204);
    expect(res.body).toBe("");
    const get = await app.inject({ method: "GET", url: "/bookings/booking-1" });
    expect(get.json().status).toBe("cancelled");
  });

  it("204 et statut late_cancelled pour booking-3 (moins de 24 h avant)", async () => {
    await app.inject({ method: "DELETE", url: "/bookings/booking-3" });
    const get = await app.inject({ method: "GET", url: "/bookings/booking-3" });
    expect(get.json().status).toBe("late_cancelled");
  });

  it("409 pour une deuxième annulation, 404 pour un identifiant inconnu", async () => {
    await app.inject({ method: "DELETE", url: "/bookings/booking-1" });
    expect((await app.inject({ method: "DELETE", url: "/bookings/booking-1" })).statusCode).toBe(409);
    expect((await app.inject({ method: "DELETE", url: "/bookings/nope" })).statusCode).toBe(404);
  });

  it("une réservation annulée disparaît du planning", async () => {
    await app.inject({ method: "DELETE", url: "/bookings/booking-1" });
    const res = await app.inject({ method: "GET", url: `/rooms/room-1/bookings?${WEEK}` });
    expect(res.json()).toEqual([]);
  });
});
