import type { MemberRepository } from "../application/ports.js";
import type { Db } from "./db.js";

export class PgMemberRepository implements MemberRepository {
  constructor(private readonly db: Db) {}

  async exists(id: string): Promise<boolean> {
    const { rowCount } = await this.db.query("SELECT 1 FROM members WHERE id = $1", [id]);
    return rowCount === 1;
  }

  async lockById(id: string): Promise<boolean> {
    const { rowCount } = await this.db.query("SELECT 1 FROM members WHERE id = $1 FOR UPDATE", [id]);
    return rowCount === 1;
  }
}
