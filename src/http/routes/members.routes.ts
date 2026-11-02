import type { FastifyInstance } from "fastify";
import type { UseCases } from "../use-cases.js";
import { presentBooking } from "../presenters.js";

export function registerMemberRoutes(app: FastifyInstance, uc: UseCases) {
  app.get<{ Params: { id: string } }>("/members/:id/bookings", async (req) => {
    const bookings = await uc.listMemberBookings.execute(req.params.id);
    return bookings.map(presentBooking);
  });
}
