import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createPool } from "../../src/infra/db.js";
import { PgUnitOfWork } from "../../src/infra/pg-unit-of-work.js";
import { NullScheduleCache } from "../../src/infra/null-schedule-cache.js";
import { CreateBooking } from "../../src/application/create-booking.js";
import { CancelBooking } from "../../src/application/cancel-booking.js";
import { seed } from "../../scripts/seed-data.js";
import { FixedClock } from "../unit/helpers.js";

const pool = createPool();
const uow = new PgUnitOfWork(pool);
const clock = new FixedClock();
const cache = new NullScheduleCache();
const createBooking = new CreateBooking(uow, clock, cache);
const cancelBooking = new CancelBooking(uow, clock, cache);

const codeOf = (r: PromiseSettledResult<unknown>) =>
  r.status === "rejected" ? (r.reason as { code?: string }).code : "OK";

beforeEach(async () => { await seed(pool); });
afterAll(async () => { await pool.end(); });

describe("CreateBooking (base réelle)", () => {
  it("crée une réservation confirmée pour member-3", async () => {
    const b = await createBooking.execute({
      roomId: "room-1", memberId: "member-3", start: "2026-11-04T14:00:00Z", end: "2026-11-04T16:00:00Z",
    });
    expect(b.status).toBe("confirmed");
    expect(b.id).toBeTruthy();
  });

  it("refuse une salle inconnue", async () => {
    await expect(createBooking.execute({
      roomId: "room-99", memberId: "member-3", start: "2026-11-04T14:00:00Z", end: "2026-11-04T16:00:00Z",
    })).rejects.toMatchObject({ code: "ROOM_NOT_FOUND" });
  });

  it("deux membres, même salle, même créneau, en même temps : un seul gagne", async () => {
    const input = { roomId: "room-3", start: "2026-11-04T14:00:00Z", end: "2026-11-04T16:00:00Z" };
    const results = await Promise.allSettled([
      createBooking.execute({ ...input, memberId: "member-2" }),
      createBooking.execute({ ...input, memberId: "member-3" }),
    ]);
    expect(results.map(codeOf).sort()).toEqual(["OK", "SLOT_TAKEN"]);
  });

  it("member-2 (1 à venir) envoie 2 demandes simultanées : une seule passe", async () => {
    const results = await Promise.allSettled([
      createBooking.execute({ roomId: "room-1", memberId: "member-2", start: "2026-11-04T14:00:00Z", end: "2026-11-04T16:00:00Z" }),
      createBooking.execute({ roomId: "room-3", memberId: "member-2", start: "2026-11-04T14:00:00Z", end: "2026-11-04T16:00:00Z" }),
    ]);
    expect(results.map(codeOf).sort()).toEqual(["MEMBER_LIMIT_REACHED", "OK"]);
  });
});

describe("CancelBooking (base réelle)", () => {
  it("booking-3 commence dans moins de 24 h : late_cancelled", async () => {
    expect((await cancelBooking.execute("booking-3")).status).toBe("late_cancelled");
  });

  it("refuse une deuxième annulation", async () => {
    await cancelBooking.execute("booking-1");
    await expect(cancelBooking.execute("booking-1")).rejects.toMatchObject({ code: "ALREADY_CANCELLED" });
  });

  it("un créneau annulé redevient réservable", async () => {
    await cancelBooking.execute("booking-1");
    const b = await createBooking.execute({
      roomId: "room-1", memberId: "member-3", start: "2026-11-03T18:00:00Z", end: "2026-11-03T20:00:00Z",
    });
    expect(b.status).toBe("confirmed");
  });
});
