import type { Room } from "../domain/room.js";
import type { RoomRepository } from "../application/ports.js";
import type { Db } from "./db.js";

interface RoomRow {
  id: string;
  name: string;
  capacity: number;
  maintenance_start: Date | null;
  maintenance_end: Date | null;
}

const toRoom = (r: RoomRow): Room => ({
  id: r.id,
  name: r.name,
  capacity: r.capacity,
  maintenance: r.maintenance_start && r.maintenance_end
    ? { start: r.maintenance_start, end: r.maintenance_end }
    : null,
});

export class PgRoomRepository implements RoomRepository {
  constructor(private readonly db: Db) {}

  async findAll(): Promise<Room[]> {
    const { rows } = await this.db.query<RoomRow>("SELECT * FROM rooms ORDER BY id");
    return rows.map(toRoom);
  }

  async findById(id: string): Promise<Room | null> {
    const { rows } = await this.db.query<RoomRow>("SELECT * FROM rooms WHERE id = $1", [id]);
    return rows[0] ? toRoom(rows[0]) : null;
  }
}
