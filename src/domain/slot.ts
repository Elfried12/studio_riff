import { ValidationError } from "./errors.js";

export interface Period {
  readonly start: Date;
  readonly end: Date;
}

export type Slot = Period;

const HOUR_MS = 60 * 60 * 1000;
export const OPENING_HOUR = 10;
export const CLOSING_HOUR = 23;
export const MIN_DURATION_H = 1;
export const MAX_DURATION_H = 4;

/** Intervalles semi-ouverts [start, end) : deux créneaux qui se touchent ne se chevauchent pas */
export function overlaps(a: Period, b: Period): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

function isFullHour(date: Date): boolean {
  return date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;
}

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function createSlot(start: Date, end: Date, now: Date): Slot {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ValidationError("INVALID_DATE", "start et end doivent être des dates ISO 8601 valides");
  }
  if (!isFullHour(start) || !isFullHour(end)) {
    throw new ValidationError("NOT_FULL_HOUR", "Un créneau commence et finit à une heure pleine");
  }

  const hours = (end.getTime() - start.getTime()) / HOUR_MS;
  if (hours < MIN_DURATION_H || hours > MAX_DURATION_H) {
    throw new ValidationError("INVALID_DURATION", "Un créneau dure de 1 h à 4 h");
  }

  const sameDay = utcDay(start) === utcDay(end);
  if (start.getUTCHours() < OPENING_HOUR || !sameDay || end.getUTCHours() > CLOSING_HOUR) {
    throw new ValidationError("OUTSIDE_OPENING_HOURS", "Un créneau se situe entre 10 h et 23 h (UTC)");
  }

  if (start.getTime() <= now.getTime()) {
    throw new ValidationError("SLOT_IN_PAST", "Un créneau doit commencer dans le futur");
  }

  return { start, end };
}
