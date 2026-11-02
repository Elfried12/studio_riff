import type { Booking, BookingStatus } from "../domain/booking.js";
import type { Room } from "../domain/room.js";

export interface NewBooking {
  roomId: string;
  memberId: string;
  start: Date;
  end: Date;
}

export interface RoomRepository {
  findAll(): Promise<Room[]>;
  findById(id: string): Promise<Room | null>;
}

export interface MemberRepository {
  exists(id: string): Promise<boolean>;
  /** Verrouille la ligne du membre jusqu'à la fin de la transaction. Renvoie false s'il n'existe pas. */
  lockById(id: string): Promise<boolean>;
}

export interface BookingRepository {
  findById(id: string): Promise<Booking | null>;
  /** Verrouille la réservation jusqu'à la fin de la transaction */
  findByIdForUpdate(id: string): Promise<Booking | null>;
  /** Réservations confirmées d'une salle qui chevauchent [from, to) */
  findActiveByRoomBetween(roomId: string, from: Date, to: Date): Promise<Booking[]>;
  findByMember(memberId: string): Promise<Booking[]>;
  insert(data: NewBooking): Promise<Booking>;
  updateStatus(id: string, status: BookingStatus): Promise<Booking>;
}

export interface Repositories {
  rooms: RoomRepository;
  members: MemberRepository;
  bookings: BookingRepository;
}

export interface UnitOfWork {
  /** Exécute `work` dans une transaction : COMMIT si tout passe, ROLLBACK sinon */
  run<T>(work: (repos: Repositories) => Promise<T>): Promise<T>;
}

export interface ScheduleCache {
  get(roomId: string, from: Date, to: Date): Promise<Booking[] | null>;
  set(roomId: string, from: Date, to: Date, bookings: Booking[]): Promise<void>;
  invalidateRoom(roomId: string): Promise<void>;
}
