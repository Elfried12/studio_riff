import Fastify, { type FastifyServerOptions } from "fastify";
import type pg from "pg";
import type { Clock } from "./domain/clock.js";
import type { ScheduleCache } from "./application/ports.js";
import { ListRooms } from "./application/list-rooms.js";
import { GetRoomSchedule } from "./application/get-room-schedule.js";
import { CreateBooking } from "./application/create-booking.js";
import { GetBooking } from "./application/get-booking.js";
import { CancelBooking } from "./application/cancel-booking.js";
import { ListMemberBookings } from "./application/list-member-bookings.js";
import { createRepositories, PgUnitOfWork } from "./infra/pg-unit-of-work.js";
import { errorHandler } from "./http/error-handler.js";
import { registerRoomRoutes } from "./http/routes/rooms.routes.js";
import { registerBookingRoutes } from "./http/routes/bookings.routes.js";
import { registerMemberRoutes } from "./http/routes/members.routes.js";
import type { UseCases } from "./http/use-cases.js";

export interface AppDeps {
  pool: pg.Pool;
  clock: Clock;
  cache: ScheduleCache;
}

export function buildApp(deps: AppDeps, options: FastifyServerOptions = {}) {
  const repos = createRepositories(deps.pool);
  const uow = new PgUnitOfWork(deps.pool);

  const useCases: UseCases = {
    listRooms: new ListRooms(repos),
    getRoomSchedule: new GetRoomSchedule(repos, deps.cache),
    createBooking: new CreateBooking(uow, deps.clock, deps.cache),
    getBooking: new GetBooking(repos),
    cancelBooking: new CancelBooking(uow, deps.clock, deps.cache),
    listMemberBookings: new ListMemberBookings(repos),
  };

  const app = Fastify(options);
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler((req, reply) =>
    reply.code(404).send({ error: "ROUTE_NOT_FOUND", message: `${req.method} ${req.url} n'existe pas` }));

  registerRoomRoutes(app, useCases);
  registerBookingRoutes(app, useCases);
  registerMemberRoutes(app, useCases);

  return app;
}
