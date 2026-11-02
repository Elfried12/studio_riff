CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE rooms (
  id                text PRIMARY KEY,
  name              text NOT NULL,
  capacity          int  NOT NULL CHECK (capacity > 0),
  maintenance_start timestamptz,
  maintenance_end   timestamptz,
  CHECK (
    (maintenance_start IS NULL AND maintenance_end IS NULL)
    OR maintenance_start < maintenance_end
  )
);

CREATE TABLE members (
  id   text PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE bookings (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  room_id    text NOT NULL REFERENCES rooms(id),
  member_id  text NOT NULL REFERENCES members(id),
  start_at   timestamptz NOT NULL,
  end_at     timestamptz NOT NULL,
  status     text NOT NULL DEFAULT 'confirmed'
             CHECK (status IN ('confirmed', 'cancelled', 'late_cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at),
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  ) WHERE (status = 'confirmed')
);
