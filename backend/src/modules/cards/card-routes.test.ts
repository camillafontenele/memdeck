import Fastify from "fastify";
import jwt from "@fastify/jwt";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  deck: { findFirst: vi.fn() },
  card: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock("../../lib/prisma.js", () => ({ prisma: prismaMock }));

import { cardRoutes } from "./card-routes.js";

async function appWithToken() {
  const app = Fastify();
  await app.register(jwt, { secret: "test-secret" });
  await app.register(cardRoutes);
  await app.ready();
  return [app, app.jwt.sign({ sub: "user-a", email: "a@test.dev" })] as const;
}

const auth = (token: string) => ({ authorization: `Bearer ${token}` });

describe("rotas de cards", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejeita frente ou verso composto apenas por espacos", async () => {
    const [app, token] = await appWithToken();
    const response = await app.inject({
      method: "POST",
      url: "/decks/deck-1/cards",
      headers: auth(token),
      payload: { front: "   ", back: "Resposta" },
    });

    expect(response.statusCode).toBe(400);
    expect(prismaMock.deck.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.card.create).not.toHaveBeenCalled();
    await app.close();
  });

  it("cria card com valores normalizados no deck autorizado", async () => {
    const [app, token] = await appWithToken();
    prismaMock.deck.findFirst.mockResolvedValue({ id: "deck-1" });
    prismaMock.card.create.mockResolvedValue({ id: "card-1", front: "Pergunta", back: "Resposta" });

    const response = await app.inject({
      method: "POST",
      url: "/decks/deck-1/cards",
      headers: auth(token),
      payload: { front: " Pergunta ", back: " Resposta " },
    });

    expect(response.statusCode).toBe(201);
    expect(prismaMock.deck.findFirst).toHaveBeenCalledWith({ where: { id: "deck-1", userId: "user-a" } });
    expect(prismaMock.card.create).toHaveBeenCalledWith({
      data: { deckId: "deck-1", front: "Pergunta", back: "Resposta" },
    });
    await app.close();
  });

  it("nao atualiza card de outro usuario", async () => {
    const [app, token] = await appWithToken();
    prismaMock.card.findFirst.mockResolvedValue(null);

    const response = await app.inject({
      method: "PATCH",
      url: "/cards/other",
      headers: auth(token),
      payload: { front: "Pergunta", back: "Resposta" },
    });

    expect(response.statusCode).toBe(404);
    expect(prismaMock.card.update).not.toHaveBeenCalled();
    await app.close();
  });

  it("nao lista cards de deck que nao pertence ao usuario", async () => {
    const [app, token] = await appWithToken();
    prismaMock.deck.findFirst.mockResolvedValue(null);

    const response = await app.inject({
      method: "GET",
      url: "/decks/other/cards",
      headers: auth(token),
    });

    expect(response.statusCode).toBe(404);
    expect(prismaMock.card.findMany).not.toHaveBeenCalled();
    await app.close();
  });

  it("exclui card autorizado somente apos localiza-lo", async () => {
    const [app, token] = await appWithToken();
    prismaMock.card.findFirst.mockResolvedValue({ id: "card-1" });
    prismaMock.card.delete.mockResolvedValue({ id: "card-1" });

    const response = await app.inject({ method: "DELETE", url: "/cards/card-1", headers: auth(token) });

    expect(response.statusCode).toBe(204);
    expect(prismaMock.card.delete).toHaveBeenCalledWith({ where: { id: "card-1" } });
    await app.close();
  });
});
