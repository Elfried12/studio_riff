import { buildApp } from "../../src/app.js";
import { createPool } from "../../src/infra/db.js";
import { NullScheduleCache } from "../../src/infra/null-schedule-cache.js";
import { FixedClock } from "../unit/helpers.js";

export function createTestApp() {
  const pool = createPool();
  const app = buildApp({ pool, clock: new FixedClock(), cache: new NullScheduleCache() });
  return { app, pool };
}

export const WEEK = "from=2026-11-02T00:00:00Z&to=2026-11-09T00:00:00Z";
