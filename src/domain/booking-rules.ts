import { ConflictError } from "./errors.js";
import { isActive, isUpcoming, type Booking } from "./booking.js";
import { isUnderMaintenance, type Room } from "./room.js";
import { overlaps, type Slot } from "./slot.js";

export const MAX_UPCOMING_PER_MEMBER = 2;

export function assertRoomNotInMaintenance(room: Room, slot: Slot): void {
  if (isUnderMaintenance(room, slot)) {
    throw new ConflictError("ROOM_UNDER_MAINTENANCE", "La salle est en maintenance sur cette période");
  }
}

export function assertNoOverlap(slot: Slot, roomBookings: readonly Booking[]): void {
  if (roomBookings.some((b) => isActive(b) && overlaps(b, slot))) {
    throw new ConflictError("SLOT_TAKEN", "Ce créneau chevauche une réservation existante");
  }
}

export function assertMemberLimit(memberBookings: readonly Booking[], now: Date): void {
  const upcoming = memberBookings.filter((b) => isUpcoming(b, now)).length;
  if (upcoming >= MAX_UPCOMING_PER_MEMBER) {
    throw new ConflictError("MEMBER_LIMIT_REACHED", "Un membre a au plus 2 réservations à venir");
  }
}

export interface NewBookingContext {
  room: Room;
  slot: Slot;
  roomBookings: readonly Booking[];
  memberBookings: readonly Booking[];
  now: Date;
}

/** Vérifie toutes les règles de création ; lève une ConflictError au premier échec */
export function assertCanBook(ctx: NewBookingContext): void {
  assertRoomNotInMaintenance(ctx.room, ctx.slot);
  assertNoOverlap(ctx.slot, ctx.roomBookings);
  assertMemberLimit(ctx.memberBookings, ctx.now);
}
