export abstract class DomainError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Donnée invalide → HTTP 400 */
export class ValidationError extends DomainError {}

/** Ressource introuvable → HTTP 404 */
export class NotFoundError extends DomainError {}

/** Conflit avec l'état actuel → HTTP 409 */
export class ConflictError extends DomainError {}
