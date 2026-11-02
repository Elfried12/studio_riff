import type { Room } from "../domain/room.js";
import type { Repositories } from "./ports.js";

export class ListRooms {
  constructor(private readonly repos: Repositories) {}

  execute(): Promise<Room[]> {
    return this.repos.rooms.findAll();
  }
}
