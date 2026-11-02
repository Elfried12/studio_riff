import type { Booking } from "../domain/booking.js";
import type { Clock } from "../domain/clock.js";
import { assertCanBook } from "../domain/booking-rules.js";
import { NotFoundError } from "../domain/errors.js";
import { createSlot } from "../domain/slot.js";
import type { ScheduleCache, UnitOfWork } from "./ports.js";

export interface CreateBookingInput {
  roomId: string;
  memberId: string;
  start: string;
  end: string;
}

export class CreateBooking {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly cache: ScheduleCache,
  ) {}

  async execute(input: CreateBookingInput): Promise<Booking> {
    const now = this.clock.now();
    const slot = createSlot(new Date(input.start), new Date(input.end), now);

    const booking = await this.uow.run(async (repos) => {
      const room = await repos.rooms.findById(input.roomId);
      if (!room) throw new NotFoundError("ROOM_NOT_FOUND", `Salle ${input.roomId} introuvable`);

      // Verrou : deux demandes du même membre passent l'une après l'autre
      const memberExists = await repos.members.lockById(input.memberId);
      if (!memberExists) throw new NotFoundError("MEMBER_NOT_FOUND", `Membre ${input.memberId} introuvable`);

      const roomBookings = await repos.bookings.findActiveByRoomBetween(room.id, slot.start, slot.end);
      const memberBookings = await repos.bookings.findByMember(input.memberId);

      assertCanBook({ room, slot, roomBookings, memberBookings, now });

      // La contrainte d'exclusion reste le dernier rempart contre le chevauchement
      return repos.bookings.insert({ roomId: room.id, memberId: input.memberId, start: slot.start, end: slot.end });
    });

    await this.cache.invalidateRoom(booking.roomId);
    return booking;
  }
}
