import type { Clock } from "../../src/domain/clock.js";
import type { Booking } from "../../src/domain/booking.js";
import type { DomainError } from "../../src/domain/errors.js";

/** Horloge des tests : lundi 2 novembre 2026, 9 h UTC */
export const NOW = new Date("2026-11-02T09:00:00Z");

export class FixedClock implements Clock {
  constructor(private readonly date: Date = NOW) {}
  now(): Date {
    return new Date(this.date);
  }
}

export const d = (iso: string) => new Date(iso);

/** Renvoie le code de l'erreur levée, ou null si aucune erreur */
export function errorCode(fn: () => unknown): string | null {
  try {
    fn();
  } catch (e) {
    return (e as DomainError).code ?? "UNKNOWN";
  }
  return null;
}

export function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-x",
    roomId: "room-1",
    memberId: "member-3",
    start: d("2026-11-04T14:00:00Z"),
    end: d("2026-11-04T16:00:00Z"),
    status: "confirmed",
    ...overrides,
  };
}
