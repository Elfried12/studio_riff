import type pg from "pg";
import type { Repositories, UnitOfWork } from "../application/ports.js";
import type { Db } from "./db.js";
import { PgRoomRepository } from "./pg-room-repository.js";
import { PgMemberRepository } from "./pg-member-repository.js";
import { PgBookingRepository } from "./pg-booking-repository.js";

export function createRepositories(db: Db): Repositories {
  return {
    rooms: new PgRoomRepository(db),
    members: new PgMemberRepository(db),
    bookings: new PgBookingRepository(db),
  };
}

export class PgUnitOfWork implements UnitOfWork {
  constructor(private readonly pool: pg.Pool) {}

  async run<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(createRepositories(client));
      await client.query("COMMIT");
      return result;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}
