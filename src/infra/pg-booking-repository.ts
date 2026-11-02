import type { Booking, BookingStatus } from "../domain/booking.js";
import { ConflictError } from "../domain/errors.js";
import type { BookingRepository, NewBooking } from "../application/ports.js";
import type { Db } from "./db.js";

interface BookingRow {
  id: string;
  room_id: string;
  member_id: string;
  start_at: Date;
  end_at: Date;
  status: BookingStatus;
}

const COLUMNS = "id, room_id, member_id, start_at, end_at, status";

const toBooking = (r: BookingRow): Booking => ({
  id: r.id,
  roomId: r.room_id,
  memberId: r.member_id,
  start: r.start_at,
  end: r.end_at,
  status: r.status,
});

const EXCLUSION_VIOLATION = "23P01";

export class PgBookingRepository implements BookingRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<Booking | null> {
    const { rows } = await this.db.query<BookingRow>(`SELECT ${COLUMNS} FROM bookings WHERE id = $1`, [id]);
    return rows[0] ? toBooking(rows[0]) : null;
  }

  async findByIdForUpdate(id: string): Promise<Booking | null> {
    const { rows } = await this.db.query<BookingRow>(
      `SELECT ${COLUMNS} FROM bookings WHERE id = $1 FOR UPDATE`, [id]);
    return rows[0] ? toBooking(rows[0]) : null;
  }

  async findActiveByRoomBetween(roomId: string, from: Date, to: Date): Promise<Booking[]> {
    const { rows } = await this.db.query<BookingRow>(
      `SELECT ${COLUMNS} FROM bookings
        WHERE room_id = $1 AND status = 'confirmed' AND start_at < $3 AND end_at > $2
        ORDER BY start_at`,
      [roomId, from, to]);
    return rows.map(toBooking);
  }

  async findByMember(memberId: string): Promise<Booking[]> {
    const { rows } = await this.db.query<BookingRow>(
      `SELECT ${COLUMNS} FROM bookings WHERE member_id = $1 ORDER BY start_at`, [memberId]);
    return rows.map(toBooking);
  }

  async insert(data: NewBooking): Promise<Booking> {
    try {
      const { rows } = await this.db.query<BookingRow>(
        `INSERT INTO bookings (room_id, member_id, start_at, end_at)
         VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
        [data.roomId, data.memberId, data.start, data.end]);
      return toBooking(rows[0]);
    } catch (e) {
      if ((e as { code?: string }).code === EXCLUSION_VIOLATION) {
        throw new ConflictError("SLOT_TAKEN", "Ce créneau chevauche une réservation existante");
      }
      throw e;
    }
  }

  async updateStatus(id: string, status: BookingStatus): Promise<Booking> {
    const { rows } = await this.db.query<BookingRow>(
      `UPDATE bookings SET status = $2 WHERE id = $1 RETURNING ${COLUMNS}`, [id, status]);
    return toBooking(rows[0]);
  }
}
