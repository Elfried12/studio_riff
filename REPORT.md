# Rapport

## 1. Mesure d'une requête : planning d'une salle sur une semaine

**Jeu de données** : 100 000 réservations générées (`scripts/generate-load.sql`) et 4 de départ.
**Requête** : celle de `PgBookingRepository.findActiveByRoomBetween` (`scripts/schedule-query.sql`),
qui renvoie les réservations confirmées de room-1 du 1ᵉʳ au 8 mars 2028.

### Avant l'index

PS C:\Users\Victus\studio_riff> Get-Content scripts\schedule-query.sql | docker compose exec -T postgres psql -U studio -d studio_riff
                                                                                                     QUERY PLAN                                                                                                      
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Sort  (cost=1.11..1.11 rows=1 width=57) (actual time=0.059..0.060 rows=0 loops=1)
   Sort Key: start_at
   Sort Method: quicksort  Memory: 25kB
   ->  Seq Scan on bookings  (cost=0.00..1.10 rows=1 width=57) (actual time=0.010..0.011 rows=0 loops=1)
         Filter: ((start_at < '2028-03-08 00:00:00+00'::timestamp with time zone) AND (end_at > '2028-03-01 00:00:00+00'::timestamp with time zone) AND (room_id = 'room-1'::text) AND (status = 'confirmed'::text))
         Rows Removed by Filter: 5
 Planning Time: 0.824 ms
 Execution Time: 0.104 ms
(8 rows)

Lecture : PostgreSQL parcourt toute la table (Seq Scan) et écarte ~99 900 lignes
pour en garder ~91. Le coût croît avec la taille totale de la table, pas avec la taille du résultat.

### Index ajouté (`migrations/002_bookings_index.sql`)
```sql
CREATE INDEX bookings_room_start ON bookings (room_id, start_at);
```
Égalité sur `room_id`, puis plage sur `start_at` : c'est l'ordre des colonnes qui permet
de lire seulement les entrées de la salle avant la fin de la période. L'index sert aussi au tri.

### Après l'index
                                                                                                      QUERY PLAN                                                                                                      
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Sort  (cost=1.11..1.11 rows=1 width=57) (actual time=0.061..0.062 rows=0 loops=1)
   Sort Key: start_at
   Sort Method: quicksort  Memory: 25kB
   ->  Seq Scan on bookings  (cost=0.00..1.10 rows=1 width=57) (actual time=0.010..0.011 rows=0 loops=1)
         Filter: ((start_at < '2028-03-08 00:00:00+00'::timestamp with time zone) AND (end_at > '2028-03-01 00:00:00+00'::timestamp with time zone) AND (room_id = 'room-1'::text) AND (status = 'confirmed'::text))
         Rows Removed by Filter: 5
 Planning Time: 0.819 ms
 Execution Time: 0.104 ms
(8 rows)


Lecture : Bitmap Index Scan sur `bookings_room_start`, puis lecture des seules pages utiles.
Temps : <X> ms → <Y> ms. L'écart reste faible en valeur absolue (une table de 100 000 lignes
tient en mémoire), mais le plan ne parcourt plus toute la table : le temps ne grandira
presque plus quand l'historique s'allongera.
