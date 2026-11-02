import type { FastifyInstance } from "fastify";
import type { UseCases } from "../use-cases.js";
import { presentBooking, presentRoom } from "../presenters.js";
import { createBookingSchema, type CreateBookingBody } from "../schemas.js";

export function registerRoomRoutes(app: FastifyInstance, uc: UseCases) {
  app.get("/rooms", async () => {
    const rooms = await uc.listRooms.execute();
    return rooms.map(presentRoom);
  });

  app.get<{ Params: { id: string }; Querystring: { from?: string; to?: string } }>(
    "/rooms/:id/bookings",
    async (req) => {
      const bookings = await uc.getRoomSchedule.execute(req.params.id, req.query.from, req.query.to);
      return bookings.map(presentBooking);
    },
  );

  app.post<{ Params: { id: string }; Body: CreateBookingBody }>(
    "/rooms/:id/bookings",
    { schema: createBookingSchema },
    async (req, reply) => {
      const booking = await uc.createBooking.execute({
        roomId: req.params.id,
        memberId: req.body.memberId,
        start: req.body.start,
        end: req.body.end,
      });
      return reply.code(201).header("Location", `/bookings/${booking.id}`).send(presentBooking(booking));
    },
  );
}
