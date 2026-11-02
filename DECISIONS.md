## ADR-001 : driver `pg` et SQL brut plutôt qu'un ORM
**Contexte** : les garanties critiques reposent sur des fonctionnalités propres à
PostgreSQL : contrainte d'exclusion GiST sur tstzrange, `SELECT … FOR UPDATE`,
code d'erreur 23P01.
**Décision** : driver `pg`, requêtes SQL paramétrées dans des repositories,
migrations en fichiers .sql versionnés.
**Conséquences** : + le SQL est visible et maîtrisé, aucune magie ; + pas de
dépendance lourde. − mapping lignes → objets écrit à la main ; − pas de typage
automatique des requêtes.

## Interprétations des règles
- « Entre 10 h et 23 h » : le créneau entier tient dans [10 h, 23 h] UTC, le même jour.
  Le dernier début possible est donc 22 h pour 1 h (cohérent avec les 13 créneaux du script de charge).
- « À venir » : statut confirmed et début strictement après l'heure actuelle.
- Exactement 24 h avant le début, l'annulation n'est pas tardive (« moins de 24 h »).
- Une réservation dans le passé est refusée (400 SLOT_IN_PAST).
- Codes HTTP : règle de forme (créneau) → 400 ; conflit avec l'état (chevauchement,
  maintenance, limite, double annulation) → 409.

## Couche HTTP
- Le handler valide uniquement la forme du JSON (schéma Fastify) et délègue au cas d'usage.
- Correspondance erreurs → statuts dans `http/error-handler.ts` :
  ValidationError → 400, NotFoundError → 404, ConflictError → 409.
- Corps d'erreur : `{ "error": "<CODE>", "message": "…" }`.
- `GET /rooms/:id/bookings` sans `from`/`to` valides renvoie 400 (non listé au contrat,
  mais refuser une période absente vaut mieux que deviner une semaine).
- Les dates sont renvoyées sans millisecondes (`2026-11-04T14:00:00Z`), comme dans le sujet.


