import { ConflictError } from "./errors.js";

export type BookingStatus = "confirmed" | "cancelled" | "late_cancelled";

export interface Booking {
  readonly id: string;
  readonly roomId: string;
  readonly memberId: string;
  readonly start: Date;
  readonly end: Date;
  readonly status: BookingStatus;
}

const LATE_CANCELLATION_MS = 24 * 60 * 60 * 1000;

export function isActive(booking: Booking): boolean {
  return booking.status === "confirmed";
}

export function isUpcoming(booking: Booking, now: Date): boolean {
  return isActive(booking) && booking.start.getTime() > now.getTime();
}

/** Renvoie une nouvelle réservation annulée ; l'original n'est pas modifié */
export function cancelBooking(booking: Booking, now: Date): Booking {
  if (booking.status !== "confirmed") {
    throw new ConflictError("ALREADY_CANCELLED", "Cette réservation est déjà annulée");
  }
  const isLate = booking.start.getTime() - now.getTime() < LATE_CANCELLATION_MS;
  return { ...booking, status: isLate ? "late_cancelled" : "cancelled" };
}
