import { buildApp } from "./app.js";
import { createPool } from "./infra/db.js";
import { SystemClock } from "./infra/system-clock.js";
import { createValkeyClient } from "./infra/valkey-client.js";
import { ValkeyScheduleCache } from "./infra/valkey-schedule-cache.js";

const pool = createPool();
const valkey = createValkeyClient();
const app = buildApp(
  { pool, clock: new SystemClock(), cache: new ValkeyScheduleCache(valkey) },
  { logger: true },
);

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "127.0.0.1" });

const shutdown = async () => {
  await app.close();
  await pool.end();
  valkey.disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
