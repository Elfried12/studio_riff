import { buildApp } from "./app.js";
import { createPool } from "./infra/db.js";
import { SystemClock } from "./infra/system-clock.js";
import { NullScheduleCache } from "./infra/null-schedule-cache.js";

const pool = createPool();
const app = buildApp(
  { pool, clock: new SystemClock(), cache: new NullScheduleCache() }, // Valkey branché à l'étape 6
  { logger: true },
);

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "127.0.0.1" });

const shutdown = async () => {
  await app.close();
  await pool.end();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
