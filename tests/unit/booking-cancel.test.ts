import { describe, it, expect } from "vitest";
import { cancelBooking } from "../../src/domain/booking.js";
import { NOW, d, errorCode, makeBooking } from "./helpers.js";

describe("cancelBooking", () => {
  it("annule normalement à plus de 24 h (booking-1, 3 nov. 18 h)", () => {
    const b = makeBooking({ id: "booking-1", start: d("2026-11-03T18:00:00Z"), end: d("2026-11-03T20:00:00Z") });
    expect(cancelBooking(b, NOW).status).toBe("cancelled");
  });

  it("annule tardivement à moins de 24 h (booking-3, 2 nov. 19 h)", () => {
    const b = makeBooking({ id: "booking-3", start: d("2026-11-02T19:00:00Z"), end: d("2026-11-02T21:00:00Z") });
    expect(cancelBooking(b, NOW).status).toBe("late_cancelled");
  });

  it("exactement 24 h avant n'est pas tardif", () => {
    const b = makeBooking({ start: d("2026-11-03T09:00:00Z"), end: d("2026-11-03T10:00:00Z") });
    expect(cancelBooking(b, NOW).status).toBe("cancelled");
  });

  it("refuse une deuxième annulation", () => {
    expect(errorCode(() => cancelBooking(makeBooking({ status: "cancelled" }), NOW))).toBe("ALREADY_CANCELLED");
    expect(errorCode(() => cancelBooking(makeBooking({ status: "late_cancelled" }), NOW))).toBe("ALREADY_CANCELLED");
  });

  it("ne modifie pas la réservation d'origine", () => {
    const b = makeBooking();
    cancelBooking(b, NOW);
    expect(b.status).toBe("confirmed");
  });
});
