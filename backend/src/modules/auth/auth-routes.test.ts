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

  it.each([undefined, "Bearer invalid"])("rejeita perfil sem JWT valido: %s", async (authorization) => {
    const app = await appWithAuthRoutes();
    try {
      const response = await app.inject({ method: "GET", url: "/auth/me", headers: authorization ? { authorization } : {} });
      expect(response.statusCode).toBe(401);
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });

  it("retorna somente dados publicos do usuario do token", async () => {
    const app = await appWithAuthRoutes();
    try {
      prismaMock.user.findUnique.mockResolvedValue({ id: "user-a", name: "Ana", email: "ana@test.dev", passwordHash: "private" });
      const token = app.jwt.sign({ sub: "user-a" });
      const response = await app.inject({ method: "GET", url: "/auth/me?userId=user-b", headers: { authorization: `Bearer ${token}` } });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ id: "user-a", name: "Ana", email: "ana@test.dev" });
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: "user-a" }, select: { id: true, name: true, email: true } });
    } finally { await app.close(); }
  });

  it("rejeita perfil de usuario removido", async () => {
    const app = await appWithAuthRoutes();
    try {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const token = app.jwt.sign({ sub: "removed" });
      const response = await app.inject({ method: "GET", url: "/auth/me", headers: { authorization: `Bearer ${token}` } });
      expect(response.statusCode).toBe(401);
    } finally { await app.close(); }
  });

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

  it("limita cadastros por IP antes de acessar o banco ou calcular hashes", async () => {
    const app = await appWithAuthRoutes();
    try {
      prismaMock.user.findUnique.mockResolvedValue({ id: "exists" });
      for (let i = 0; i < 5; i++) {
        expect((await app.inject({ method: "POST", url: "/auth/register", payload: { name: "Ana", email: `ana${i}@test.dev`, password: "segredo" } })).statusCode).toBe(409);
      }
      const blocked = await app.inject({ method: "POST", url: "/auth/register", payload: { name: "Ana", email: "next@test.dev", password: "segredo" } });
      expect(blocked.statusCode).toBe(429);
      expect(blocked.headers["retry-after"]).toBeDefined();
      expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(5);
      expect(argon2Mock.hash).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });

  it("limita login por conta mesmo com IPs diferentes", async () => {
    const app = await appWithAuthRoutes();
    try {
      prismaMock.user.findUnique.mockResolvedValue(null);
      for (let i = 0; i < 10; i++) {
        expect((await app.inject({ method: "POST", url: "/auth/login", remoteAddress: `192.0.2.${i + 1}`, payload: { email: "ana@test.dev", password: "errada" } })).statusCode).toBe(401);
      }
      expect((await app.inject({ method: "POST", url: "/auth/login", remoteAddress: "192.0.2.50", payload: { email: "ANA@test.dev", password: "errada" } })).statusCode).toBe(429);
      expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(10);
    } finally { await app.close(); }
  });

  it("limita login por IP mesmo com e-mails diferentes e não confia em X-Forwarded-For", async () => {
    const app = await appWithAuthRoutes();
    try {
      prismaMock.user.findUnique.mockResolvedValue(null);
      for (let i = 0; i < 30; i++) await app.inject({ method: "POST", url: "/auth/login", payload: { email: `ana${i}@test.dev`, password: "errada" } });
      const response = await app.inject({ method: "POST", url: "/auth/login", headers: { "x-forwarded-for": "203.0.113.9" }, payload: { email: "next@test.dev", password: "errada" } });
      expect(response.statusCode).toBe(429); expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(30);
    } finally { await app.close(); }
  });
});
