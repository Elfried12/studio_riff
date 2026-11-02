// scripts/seed.ts
import pg from "pg";
import { seed } from "./seed-data.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await seed(pool);
await pool.end();
console.log("✔ données de départ insérées");
