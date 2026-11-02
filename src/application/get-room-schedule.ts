import type { Booking } from "../domain/booking.js";
import { NotFoundError, ValidationError } from "../domain/errors.js";
import type { Repositories, ScheduleCache } from "./ports.js";

function parseDate(value: string | undefined, name: string): Date {
  const date = value ? new Date(value) : new Date(NaN);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError("INVALID_RANGE", `Paramètre ${name} absent ou invalide (ISO 8601 attendu)`);
  }
  return date;
}

export class GetRoomSchedule {
  constructor(
    private readonly repos: Repositories,
    private readonly cache: ScheduleCache,
  ) {}

  async execute(roomId: string, fromRaw?: string, toRaw?: string): Promise<Booking[]> {
    const from = parseDate(fromRaw, "from");
    const to = parseDate(toRaw, "to");
    if (from >= to) throw new ValidationError("INVALID_RANGE", "from doit être antérieur à to");

        const { bookings: cached, token } = await this.cache.lookup(roomId, from, to);
    if (cached) return cached;

    const room = await this.repos.rooms.findById(roomId);
    if (!room) throw new NotFoundError("ROOM_NOT_FOUND", `Salle ${roomId} introuvable`);

    const bookings = await this.repos.bookings.findActiveByRoomBetween(roomId, from, to);
    await this.cache.store(token, bookings);
    return bookings;
  }
}
