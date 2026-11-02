import type { Booking } from "../domain/booking.js";
import type { CacheLookup, ScheduleCache } from "../application/ports.js";

/** Cache qui ne fait rien : utilisé dans les tests HTTP qui ne portent pas sur le cache */
export class NullScheduleCache implements ScheduleCache {
  async lookup(): Promise<CacheLookup> { return { bookings: null, token: null }; }
  async store(_token: string | null, _bookings: Booking[]): Promise<void> {}
  async invalidateRoom(): Promise<void> {}
}
