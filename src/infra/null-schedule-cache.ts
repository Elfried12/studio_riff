import type { Booking } from "../domain/booking.js";
import type { ScheduleCache } from "../application/ports.js";

/** Cache qui ne fait rien : utilisé dans les tests et tant que Valkey n'est pas branché */
export class NullScheduleCache implements ScheduleCache {
  async get(): Promise<Booking[] | null> { return null; }
  async set(): Promise<void> {}
  async invalidateRoom(): Promise<void> {}
}
