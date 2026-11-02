import type { ListRooms } from "../application/list-rooms.js";
import type { GetRoomSchedule } from "../application/get-room-schedule.js";
import type { CreateBooking } from "../application/create-booking.js";
import type { GetBooking } from "../application/get-booking.js";
import type { CancelBooking } from "../application/cancel-booking.js";
import type { ListMemberBookings } from "../application/list-member-bookings.js";

export interface UseCases {
  listRooms: ListRooms;
  getRoomSchedule: GetRoomSchedule;
  createBooking: CreateBooking;
  getBooking: GetBooking;
  cancelBooking: CancelBooking;
  listMemberBookings: ListMemberBookings;
}
