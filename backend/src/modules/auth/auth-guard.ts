import type { FastifyRequest } from "fastify";

export async function authGuard(request: FastifyRequest) {
  await request.jwtVerify();
}