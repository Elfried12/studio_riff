import type { Redis } from "ioredis";
import type { Booking } from "../domain/booking.js";
import type { CacheLookup, ScheduleCache } from "../application/ports.js";

export const SCHEDULE_TTL_SECONDS = 60;

const versionKey = (roomId: string) => `schedule:${roomId}:version`;
const dataKey = (roomId: string, version: string, from: Date, to: Date) =>
  `schedule:${roomId}:v${version}:${from.toISOString()}:${to.toISOString()}`;

type CachedBooking = Omit<Booking, "start" | "end"> & { start: string; end: string };

const revive = (b: CachedBooking): Booking => ({ ...b, start: new Date(b.start), end: new Date(b.end) });

type Warn = (message: string, error: unknown) => void;
const defaultWarn: Warn = (message, error) => console.warn(`[cache] ${message} : ${(error as Error).message}`);

/** Toute erreur Valkey est absorbée : le cache est une optimisation, jamais une dépendance */
export class ValkeyScheduleCache implements ScheduleCache {
  constructor(
    private readonly client: Redis,
    private readonly ttlSeconds = SCHEDULE_TTL_SECONDS,
    private readonly warn: Warn = defaultWarn,
  ) {}

  async lookup(roomId: string, from: Date, to: Date): Promise<CacheLookup> {
    try {
      const version = (await this.client.get(versionKey(roomId))) ?? "0";
      const token = dataKey(roomId, version, from, to);
      const raw = await this.client.get(token);
      return { token, bookings: raw ? (JSON.parse(raw) as CachedBooking[]).map(revive) : null };
    } catch (e) {
      this.warn("lecture impossible, repli sur PostgreSQL", e);
      return { token: null, bookings: null };
    }
  }

  async store(token: string | null, bookings: Booking[]): Promise<void> {
    if (!token) return;
    try {
      await this.client.set(token, JSON.stringify(bookings), "EX", this.ttlSeconds);
    } catch (e) {
      this.warn("écriture impossible", e);
    }
  }

  async invalidateRoom(roomId: string): Promise<void> {
    try {
      await this.client.incr(versionKey(roomId));
    } catch (e) {
      this.warn(`invalidation impossible pour ${roomId}`, e);
    }
  }
}
