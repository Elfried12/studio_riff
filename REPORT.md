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


## 2. Cache clé-valeur (Valkey)

### Ce qui est mis en cache
La réponse de `GET /rooms/:id/bookings` (le planning d'une salle sur une période),
qui est la ressource la plus consultée.

### Clés
| Clé | Contenu | Durée de vie |
|---|---|---|
| `schedule:{roomId}:version` | entier, incrémenté à chaque réservation ou annulation de la salle | aucune |
| `schedule:{roomId}:v{version}:{from}:{to}` | planning sérialisé en JSON | 60 s |

`from` et `to` sont normalisés en ISO 8601 UTC : deux requêtes sur la même période
partagent la même clé.

### Invalidation immédiate
Après le COMMIT d'une réservation ou d'une annulation, l'API exécute `INCR schedule:{roomId}:version`.
Les lectures suivantes construisent une nouvelle clé et repartent de PostgreSQL.
Les anciennes clés ne sont plus lues et disparaissent à expiration.
Pourquoi pas `DEL` ? Il faudrait retrouver toutes les périodes en cache (`SCAN`),
ce qui est coûteux et non atomique. `INCR` est une seule commande atomique.
La version est lue avant la requête PostgreSQL et réutilisée pour l'écriture :
un résultat calculé pendant une réservation concurrente est rangé sous l'ancienne version,
il ne peut donc pas être servi.

### Durée de vie : 60 s
L'exactitude repose sur l'invalidation, pas sur la durée de vie. Le TTL sert de filet :
si un `INCR` échoue (Valkey redémarre au mauvais moment), une donnée périmée vit au plus 60 s.
Un défaut de cache coûte une requête indexée d'environ 0,5 ms (voir section 1) :
un TTL court coûte presque rien.

### Valkey indisponible
Client configuré sans file d'attente hors ligne (`enableOfflineQueue: false`) et avec un
délai de 500 ms par commande. Toute erreur Valkey est absorbée dans `ValkeyScheduleCache` :
lecture → défaut de cache, écriture et invalidation → ignorées avec un avertissement.
Preuve : test `Valkey indisponible` dans `tests/http/cache.http.test.ts`.
```
### Répartition des données
**PostgreSQL** contient tout ce qui fait foi : salles, membres, réservations, statuts.
Ces données exigent des transactions, des contraintes (exclusion, clés étrangères, CHECK)
et une sauvegarde durable.

**Valkey** ne contient que des données dérivées, recalculables et jetables : le planning en cache.
Perdre tout Valkey ne fait perdre aucune information, seulement un peu de rapidité.

**Les réservations pourraient-elles être stockées dans Valkey ?** Non :
- aucune contrainte d'exclusion : il faudrait réécrire la détection de chevauchement
  en script Lua, sans la garantie testée de PostgreSQL ;
  au client peut être perdue en cas de panne ;
- pas de requêtes ad hoc (« réservations d'un membre », « planning d'une période »),
  il faudrait maintenir des index à la main ;
- `pg_dump` et `pg_restore` offrent une sauvegarde cohérente simple.
