## ADR-001 : driver `pg` et SQL brut plutôt qu'un ORM
**Contexte** : les garanties critiques reposent sur des fonctionnalités propres à
PostgreSQL : contrainte d'exclusion GiST sur tstzrange, `SELECT … FOR UPDATE`,
code d'erreur 23P01.
**Décision** : driver `pg`, requêtes SQL paramétrées dans des repositories,
migrations en fichiers .sql versionnés.
**Conséquences** : + le SQL est visible et maîtrisé, aucune magie ; + pas de
dépendance lourde. − mapping lignes → objets écrit à la main ; − pas de typage
automatique des requêtes.
