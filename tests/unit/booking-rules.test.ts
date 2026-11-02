import { describe, it, expect } from "vitest";
import { assertCanBook, assertMemberLimit, assertNoOverlap, assertRoomNotInMaintenance } from "../../src/domain/booking-rules.js";
import type { Room } from "../../src/domain/room.js";
import { NOW, d, errorCode, makeBooking } from "./helpers.js";

const room1: Room = { id: "room-1", name: "Salle Hendrix", capacity: 5, maintenance: null };
const room4: Room = {
  id: "room-4", name: "Salle Björk", capacity: 3,
  maintenance: { start: d("2026-11-05T00:00:00Z"), end: d("2026-11-08T00:00:00Z") },
};
const slot = (s: string, e: string) => ({ start: d(s), end: d(e) });

const booking1 = makeBooking({ id: "booking-1", roomId: "room-1", memberId: "member-1",
  start: d("2026-11-03T18:00:00Z"), end: d("2026-11-03T20:00:00Z") });
const booking2 = makeBooking({ id: "booking-2", roomId: "room-3", memberId: "member-1",
  start: d("2026-11-10T14:00:00Z"), end: d("2026-11-10T17:00:00Z") });
const booking3 = makeBooking({ id: "booking-3", roomId: "room-2", memberId: "member-2",
  start: d("2026-11-02T19:00:00Z"), end: d("2026-11-02T21:00:00Z") });
const booking4 = makeBooking({ id: "booking-4", roomId: "room-2", memberId: "member-2",
  start: d("2026-10-28T19:00:00Z"), end: d("2026-10-28T21:00:00Z") });

describe("maintenance", () => {
  it("refuse un créneau pendant la maintenance de room-4", () => {
    expect(errorCode(() => assertRoomNotInMaintenance(room4, slot("2026-11-06T14:00:00Z", "2026-11-06T16:00:00Z"))))
      .toBe("ROOM_UNDER_MAINTENANCE");
  });

  it("accepte juste avant et juste après la maintenance", () => {
    expect(errorCode(() => assertRoomNotInMaintenance(room4, slot("2026-11-04T21:00:00Z", "2026-11-04T23:00:00Z")))).toBeNull();
    expect(errorCode(() => assertRoomNotInMaintenance(room4, slot("2026-11-08T10:00:00Z", "2026-11-08T12:00:00Z")))).toBeNull();
  });
});

describe("chevauchement", () => {
  it("refuse un créneau qui chevauche booking-1", () => {
    expect(errorCode(() => assertNoOverlap(slot("2026-11-03T19:00:00Z", "2026-11-03T21:00:00Z"), [booking1])))
      .toBe("SLOT_TAKEN");
  });

  it("accepte un créneau qui commence à la fin de booking-1", () => {
    expect(errorCode(() => assertNoOverlap(slot("2026-11-03T20:00:00Z", "2026-11-03T22:00:00Z"), [booking1]))).toBeNull();
  });

  it("ignore les réservations annulées", () => {
    const cancelled = { ...booking1, status: "cancelled" as const };
    expect(errorCode(() => assertNoOverlap(slot("2026-11-03T19:00:00Z", "2026-11-03T21:00:00Z"), [cancelled]))).toBeNull();
  });
});

describe("limite de 2 réservations à venir", () => {
  it("refuse member-1 qui a déjà 2 réservations à venir", () => {
    expect(errorCode(() => assertMemberLimit([booking1, booking2], NOW))).toBe("MEMBER_LIMIT_REACHED");
  });

  it("accepte member-2 : booking-4 est passée, il n'a qu'1 réservation à venir", () => {
    expect(errorCode(() => assertMemberLimit([booking3, booking4], NOW))).toBeNull();
  });

  it("ne compte pas les réservations annulées", () => {
    expect(errorCode(() => assertMemberLimit([booking1, { ...booking2, status: "cancelled" }], NOW))).toBeNull();
  });
});

describe("assertCanBook", () => {
  it("accepte une réservation valide pour member-3", () => {
    expect(errorCode(() => assertCanBook({
      room: room1, slot: slot("2026-11-04T14:00:00Z", "2026-11-04T16:00:00Z"),
      roomBookings: [booking1], memberBookings: [], now: NOW,
    }))).toBeNull();
  });
});
