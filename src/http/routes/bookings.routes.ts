import type { FastifyInstance } from "fastify";
import type { UseCases } from "../use-cases.js";
import { presentBooking } from "../presenters.js";

export function registerBookingRoutes(app: FastifyInstance, uc: UseCases) {
  app.get<{ Params: { id: string } }>("/bookings/:id", async (req) => {
    return presentBooking(await uc.getBooking.execute(req.params.id));
  });

  app.delete<{ Params: { id: string } }>("/bookings/:id", async (req, reply) => {
    await uc.cancelBooking.execute(req.params.id);
    return reply.code(204).send();
  });
}
