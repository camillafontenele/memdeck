import Fastify from "fastify";
import jwt from "@fastify/jwt";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
}));
const argon2Mock = vi.hoisted(() => ({ hash: vi.fn(), verify: vi.fn() }));

vi.mock("../../lib/prisma.js", () => ({ prisma: prismaMock }));
vi.mock("argon2", () => ({ default: argon2Mock }));

import { authRoutes } from "./auth-routes.js";

async function appWithAuthRoutes() {
  const app = Fastify();
  await app.register(jwt, { secret: "test-secret" });
  await app.register(authRoutes);
  await app.ready();
  return app;
}

describe("rotas de autenticacao", () => {
  beforeEach(() => vi.clearAllMocks());

  it("impede cadastro com e-mail ja utilizado", async () => {
    const app = await appWithAuthRoutes();
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1" });
    const response = await app.inject({ method: "POST", url: "/auth/register", payload: { name: "Ana", email: "ana@test.dev", password: "segredo" } });
    expect(response.statusCode).toBe(409);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    await app.close();
  });

  it("cadastra usuario com senha protegida e emite JWT", async () => {
    const app = await appWithAuthRoutes();
    prismaMock.user.findUnique.mockResolvedValue(null);
    argon2Mock.hash.mockResolvedValue("password-hash");
    prismaMock.user.create.mockResolvedValue({ id: "user-1", name: "Ana", email: "ana@test.dev" });
    const response = await app.inject({ method: "POST", url: "/auth/register", payload: { name: "Ana", email: "ana@test.dev", password: "segredo" } });
    expect(response.statusCode).toBe(201);
    expect(argon2Mock.hash).toHaveBeenCalledWith("segredo");
    expect(prismaMock.user.create).toHaveBeenCalledWith({ data: { name: "Ana", email: "ana@test.dev", passwordHash: "password-hash" } });
    expect(app.jwt.verify<{ sub: string }>(response.json().token).sub).toBe("user-1");
    await app.close();
  });

  it("retorna 401 para login de usuario inexistente", async () => {
    const app = await appWithAuthRoutes();
    prismaMock.user.findUnique.mockResolvedValue(null);
    const response = await app.inject({ method: "POST", url: "/auth/login", payload: { email: "ana@test.dev", password: "segredo" } });
    expect(response.statusCode).toBe(401);
    expect(argon2Mock.verify).not.toHaveBeenCalled();
    await app.close();
  });

  it("retorna 401 quando a senha nao confere", async () => {
    const app = await appWithAuthRoutes();
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1", passwordHash: "password-hash" });
    argon2Mock.verify.mockResolvedValue(false);
    const response = await app.inject({ method: "POST", url: "/auth/login", payload: { email: "ana@test.dev", password: "errada" } });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("autentica credenciais validas e retorna JWT", async () => {
    const app = await appWithAuthRoutes();
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1", name: "Ana", email: "ana@test.dev", passwordHash: "password-hash" });
    argon2Mock.verify.mockResolvedValue(true);
    const response = await app.inject({ method: "POST", url: "/auth/login", payload: { email: "ana@test.dev", password: "segredo" } });
    expect(response.statusCode).toBe(200);
    expect(argon2Mock.verify).toHaveBeenCalledWith("password-hash", "segredo");
    expect(app.jwt.verify<{ sub: string }>(response.json().token).sub).toBe("user-1");
    await app.close();
  });
});
