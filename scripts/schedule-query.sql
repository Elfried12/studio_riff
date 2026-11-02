EXPLAIN ANALYZE
SELECT id, room_id, member_id, start_at, end_at, status
FROM bookings
WHERE room_id = 'room-1'
  AND status = 'confirmed'
  AND start_at < '2028-03-08T00:00:00Z'
  AND end_at   > '2028-03-01T00:00:00Z'
ORDER BY start_at;
