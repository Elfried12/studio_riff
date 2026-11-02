import { describe, it, expect } from "vitest";
import { createSlot, overlaps } from "../../src/domain/slot.js";
import { NOW, d, errorCode } from "./helpers.js";

const slot = (s: string, e: string) => () => createSlot(d(s), d(e), NOW);

describe("createSlot", () => {
  it("accepte un créneau de 2 h en journée", () => {
    expect(errorCode(slot("2026-11-04T14:00:00Z", "2026-11-04T16:00:00Z"))).toBeNull();
  });

  it("accepte les bornes 10 h-11 h et 19 h-23 h", () => {
    expect(errorCode(slot("2026-11-04T10:00:00Z", "2026-11-04T11:00:00Z"))).toBeNull();
    expect(errorCode(slot("2026-11-04T19:00:00Z", "2026-11-04T23:00:00Z"))).toBeNull();
  });

  it("refuse une date invalide", () => {
    expect(errorCode(slot("pas-une-date", "2026-11-04T16:00:00Z"))).toBe("INVALID_DATE");
  });

  it("refuse un début qui n'est pas une heure pleine", () => {
    expect(errorCode(slot("2026-11-04T14:30:00Z", "2026-11-04T16:30:00Z"))).toBe("NOT_FULL_HOUR");
  });

  it("refuse moins d'1 h, plus de 4 h, et une fin avant le début", () => {
    expect(errorCode(slot("2026-11-04T14:00:00Z", "2026-11-04T14:00:00Z"))).toBe("INVALID_DURATION");
    expect(errorCode(slot("2026-11-04T14:00:00Z", "2026-11-04T19:00:00Z"))).toBe("INVALID_DURATION");
    expect(errorCode(slot("2026-11-04T16:00:00Z", "2026-11-04T14:00:00Z"))).toBe("INVALID_DURATION");
  });

  it("refuse un créneau avant 10 h ou après 23 h", () => {
    expect(errorCode(slot("2026-11-04T09:00:00Z", "2026-11-04T11:00:00Z"))).toBe("OUTSIDE_OPENING_HOURS");
    expect(errorCode(slot("2026-11-04T22:00:00Z", "2026-11-05T00:00:00Z"))).toBe("OUTSIDE_OPENING_HOURS");
  });

  it("refuse un créneau dans le passé", () => {
    expect(errorCode(slot("2026-10-30T14:00:00Z", "2026-10-30T16:00:00Z"))).toBe("SLOT_IN_PAST");
  });
});

describe("overlaps", () => {
  const a = { start: d("2026-11-04T14:00:00Z"), end: d("2026-11-04T16:00:00Z") };

  it("détecte un chevauchement partiel", () => {
    expect(overlaps(a, { start: d("2026-11-04T15:00:00Z"), end: d("2026-11-04T17:00:00Z") })).toBe(true);
  });

  it("autorise un créneau qui commence à la fin du précédent", () => {
    expect(overlaps(a, { start: d("2026-11-04T16:00:00Z"), end: d("2026-11-04T18:00:00Z") })).toBe(false);
  });
});
