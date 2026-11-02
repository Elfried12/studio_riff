import { overlaps, type Period, type Slot } from "./slot.js";

export interface Room {
  readonly id: string;
  readonly name: string;
  readonly capacity: number;
  readonly maintenance: Period | null;
}

export function isUnderMaintenance(room: Room, slot: Slot): boolean {
  return room.maintenance !== null && overlaps(room.maintenance, slot);
}
