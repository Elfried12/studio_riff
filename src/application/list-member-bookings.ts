import type { Booking } from "../domain/booking.js";
import { NotFoundError } from "../domain/errors.js";
import type { Repositories } from "./ports.js";

export class ListMemberBookings {
  constructor(private readonly repos: Repositories) {}

  async execute(memberId: string): Promise<Booking[]> {
    if (!(await this.repos.members.exists(memberId))) {
      throw new NotFoundError("MEMBER_NOT_FOUND", `Membre ${memberId} introuvable`);
    }
    return this.repos.bookings.findByMember(memberId);
  }
}
