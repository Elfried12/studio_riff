import pg from "pg";

export type Db = pg.Pool | pg.PoolClient;

export function createPool(connectionString = process.env.DATABASE_URL): pg.Pool {
  if (!connectionString) throw new Error("DATABASE_URL manquant (copiez .env.example vers .env)");
  return new pg.Pool({ connectionString });
}
