import { cancelBooking, type Booking } from "../domain/booking.js";
import type { Clock } from "../domain/clock.js";
import { NotFoundError } from "../domain/errors.js";
import type { ScheduleCache, UnitOfWork } from "./ports.js";

export class CancelBooking {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly cache: ScheduleCache,
  ) {}

  async execute(bookingId: string): Promise<Booking> {
    const cancelled = await this.uow.run(async (repos) => {
      const booking = await repos.bookings.findByIdForUpdate(bookingId);
      if (!booking) throw new NotFoundError("BOOKING_NOT_FOUND", `Réservation ${bookingId} introuvable`);

      const updated = cancelBooking(booking, this.clock.now());
      return repos.bookings.updateStatus(booking.id, updated.status);
    });

    await this.cache.invalidateRoom(cancelled.roomId);
    return cancelled;
  }
}
