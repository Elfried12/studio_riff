import type { Booking } from "../domain/booking.js";
import { NotFoundError } from "../domain/errors.js";
import type { Repositories } from "./ports.js";

export class GetBooking {
  constructor(private readonly repos: Repositories) {}

  async execute(id: string): Promise<Booking> {
    const booking = await this.repos.bookings.findById(id);
    if (!booking) throw new NotFoundError("BOOKING_NOT_FOUND", `Réservation ${id} introuvable`);
    return booking;
  }
}

