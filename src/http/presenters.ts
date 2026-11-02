import type { Booking } from "../domain/booking.js";
import type { Room } from "../domain/room.js";

/** 2026-11-04T14:00:00.000Z → 2026-11-04T14:00:00Z (format du sujet) */
const iso = (d: Date) => d.toISOString().replace(".000Z", "Z");

export function presentBooking(b: Booking) {
  return {
    id: b.id,
    roomId: b.roomId,
    memberId: b.memberId,
    start: iso(b.start),
    end: iso(b.end),
    status: b.status,
  };
}

export function presentRoom(r: Room) {
  return {
    id: r.id,
    name: r.name,
    capacity: r.capacity,
    maintenance: r.maintenance ? { start: iso(r.maintenance.start), end: iso(r.maintenance.end) } : null,
  };
}
