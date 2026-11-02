import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ConflictError, NotFoundError, ValidationError } from "../domain/errors.js";

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof ValidationError) {
    return reply.code(400).send({ error: error.code, message: error.message });
  }
  if (error instanceof NotFoundError) {
    return reply.code(404).send({ error: error.code, message: error.message });
  }
  if (error instanceof ConflictError) {
    return reply.code(409).send({ error: error.code, message: error.message });
  }
  // Body invalide selon le schéma JSON
  if (error.validation) {
    return reply.code(400).send({ error: "INVALID_BODY", message: error.message });
  }
  // JSON mal formé, body trop gros… : erreurs 4xx produites par Fastify
  if (error.statusCode && error.statusCode < 500) {
    return reply.code(error.statusCode).send({ error: error.code ?? "BAD_REQUEST", message: error.message });
  }
  request.log.error(error);
  return reply.code(500).send({ error: "INTERNAL_ERROR", message: "Erreur interne" });
}
