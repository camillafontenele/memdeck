import Fastify from "fastify";
import jwt from "@fastify/jwt";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  deck: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock("../../lib/prisma.js", () => ({ prisma: prismaMock }));
import { deckRoutes } from "./deck-routes.js";

async function appWithToken() {
  const app = Fastify();
  await app.register(jwt, { secret: "test-secret" });
  await app.register(deckRoutes);
  await app.ready();
  return [app, app.jwt.sign({ sub: "user-a", email: "a@test.dev" })] as const;
}
const auth = (token: string) => ({ authorization: `Bearer ${token}` });

describe("rotas de decks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exige JWT para listar", async () => {
    const [app] = await appWithToken();
    expect((await app.inject({ method: "GET", url: "/decks" })).statusCode).toBe(401);
    await app.close();
  });

  it("cria deck normalizando o nome e rejeita espaços", async () => {
    const [app, token] = await appWithToken();
    prismaMock.deck.create.mockResolvedValue({ id: "deck-1" });
    const invalid = await app.inject({ method: "POST", url: "/decks", headers: auth(token), payload: { name: "   " } });
    const valid = await app.inject({ method: "POST", url: "/decks", headers: auth(token), payload: { name: "  História  " } });
    expect(invalid.statusCode).toBe(400);
    expect(valid.statusCode).toBe(201);
    expect(prismaMock.deck.create).toHaveBeenCalledWith({ data: { name: "História", description: undefined, userId: "user-a" } });
    await app.close();
  });

  it("lista somente os decks do usuário autenticado", async () => {
    const [app, token] = await appWithToken();
    prismaMock.deck.findMany.mockResolvedValue([]);
    expect((await app.inject({ method: "GET", url: "/decks", headers: auth(token) })).statusCode).toBe(200);
    expect(prismaMock.deck.findMany).toHaveBeenCalledWith({ where: { userId: "user-a" } });
    await app.close();
  });

  it("não edita nem exclui deck de outro usuário", async () => {
    const [app, token] = await appWithToken();
    prismaMock.deck.findFirst.mockResolvedValue(null);
    const update = await app.inject({ method: "PATCH", url: "/decks/other", headers: auth(token), payload: { name: "Nome", description: "" } });
    const remove = await app.inject({ method: "DELETE", url: "/decks/other", headers: auth(token) });
    expect(update.statusCode).toBe(404);
    expect(remove.statusCode).toBe(404);
    expect(prismaMock.deck.update).not.toHaveBeenCalled();
    expect(prismaMock.deck.delete).not.toHaveBeenCalled();
    await app.close();
  });
  it("atualiza o nome normalizado e exclui deck autorizado", async () => {
    const [app, token] = await appWithToken();
    prismaMock.deck.findFirst.mockResolvedValue({ id: "deck-1" });
    prismaMock.deck.update.mockResolvedValue({ id: "deck-1", name: "Geografia" });
    prismaMock.deck.delete.mockResolvedValue({ id: "deck-1" });

    const update = await app.inject({ method: "PATCH", url: "/decks/deck-1", headers: auth(token), payload: { name: "  Geografia  ", description: "" } });
    const remove = await app.inject({ method: "DELETE", url: "/decks/deck-1", headers: auth(token) });

    expect(update.statusCode).toBe(200);
    expect(prismaMock.deck.update).toHaveBeenCalledWith({ where: { id: "deck-1" }, data: { name: "Geografia", description: "" } });
    expect(remove.statusCode).toBe(204);
    expect(prismaMock.deck.delete).toHaveBeenCalledWith({ where: { id: "deck-1" } });
    await app.close();
  });
});
