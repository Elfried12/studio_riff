import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);

const files = (await readdir("migrations")).filter(f => f.endsWith(".sql")).sort();
const { rows } = await client.query("SELECT name FROM schema_migrations");
const done = new Set(rows.map(r => r.name));

for (const file of files) {
  if (done.has(file)) continue;
  const sql = await readFile(`migrations/${file}`, "utf8");
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations(name) VALUES ($1)", [file]);
    await client.query("COMMIT");
    console.log(`✔ ${file}`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}
await client.end();
