// scripts/seed-data.ts
import type pg from "pg";

export async function seed(db: pg.ClientBase | pg.Pool) {
  await db.query("TRUNCATE bookings, members, rooms RESTART IDENTITY CASCADE");
  await db.query(`
    INSERT INTO rooms (id, name, capacity, maintenance_start, maintenance_end) VALUES
      ('room-1', 'Salle Hendrix', 5, NULL, NULL),
      ('room-2', 'Salle Simone',  4, NULL, NULL),
      ('room-3', 'Salle Bowie',   6, NULL, NULL),
      ('room-4', 'Salle Björk',   3, '2026-11-05T00:00:00Z', '2026-11-08T00:00:00Z')`);
  await db.query(`
    INSERT INTO members (id, name) VALUES
      ('member-1', 'Les Volts'),
      ('member-2', 'Café Noir'),
      ('member-3', 'Marée Basse')`);
  await db.query(`
    INSERT INTO bookings (id, room_id, member_id, start_at, end_at, status) VALUES
      ('booking-1', 'room-1', 'member-1', '2026-11-03T18:00:00Z', '2026-11-03T20:00:00Z', 'confirmed'),
      ('booking-2', 'room-3', 'member-1', '2026-11-10T14:00:00Z', '2026-11-10T17:00:00Z', 'confirmed'),
      ('booking-3', 'room-2', 'member-2', '2026-11-02T19:00:00Z', '2026-11-02T21:00:00Z', 'confirmed'),
      ('booking-4', 'room-2', 'member-2', '2026-10-28T19:00:00Z', '2026-10-28T21:00:00Z', 'confirmed')`);
}
