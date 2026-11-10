import Fastify from "fastify";
import jwt from "@fastify/jwt";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  deck: { findFirst: vi.fn() },
  card: { findFirst: vi.fn(), findMany: vi.fn() },
  review: { create: vi.fn() },
}));

vi.mock("../../lib/prisma.js", () => ({ prisma: prismaMock }));

import { reviewRoutes } from "./review-routes.js";

async function appWithToken() {
  const app = Fastify();
  await app.register(jwt, { secret: "test-secret" });
  await app.register(reviewRoutes);
  await app.ready();
  return [app, app.jwt.sign({ sub: "user-a", email: "a@test.dev" })] as const;
}

const auth = (token: string) => ({ authorization: `Bearer ${token}` });

describe("rotas de revisao", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exige JWT para consultar cards disponiveis", async () => {
    const [app] = await appWithToken();
    const response = await app.inject({
      method: "GET",
      url: "/decks/deck-1/reviews/available?mode=ideal",
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("retorna somente cards ainda nao revisados ou vencidos", async () => {
    const [app, token] = await appWithToken();
    prismaMock.deck.findFirst.mockResolvedValue({ id: "deck-1" });
    prismaMock.card.findMany.mockResolvedValue([
      { id: "new", reviews: [] },
      { id: "due", reviews: [{ nextReviewAt: new Date(Date.now() - 1_000) }] },
      { id: "future", reviews: [{ nextReviewAt: new Date(Date.now() + 60_000) }] },
    ]);

    const response = await app.inject({
      method: "GET",
      url: "/decks/deck-1/reviews/available?mode=ideal",
      headers: auth(token),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().map((card: { id: string }) => card.id)).toEqual(["new", "due"]);
    expect(prismaMock.deck.findFirst).toHaveBeenCalledWith({
      where: { id: "deck-1", userId: "user-a" },
    });
    await app.close();
  });

  it("aplica o limite do modo curto", async () => {
    const [app, token] = await appWithToken();
    prismaMock.deck.findFirst.mockResolvedValue({ id: "deck-1" });
    prismaMock.card.findMany.mockResolvedValue(
      Array.from({ length: 21 }, (_, index) => ({ id: String(index), reviews: [] })),
    );

    const response = await app.inject({
      method: "GET",
      url: "/decks/deck-1/reviews/available?mode=short",
      headers: auth(token),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(20);
    await app.close();
  });

  it("registra revisao apenas em card pertencente ao usuario", async () => {
    const [app, token] = await appWithToken();
    prismaMock.card.findFirst.mockResolvedValue({ id: "card-1" });
    prismaMock.review.create.mockResolvedValue({ id: "review-1", cardId: "card-1", rating: "GOOD" });

    const response = await app.inject({
      method: "POST",
      url: "/cards/card-1/reviews",
      headers: auth(token),
      payload: { rating: "GOOD" },
    });

    expect(response.statusCode).toBe(201);
    expect(prismaMock.card.findFirst).toHaveBeenCalledWith({
      where: { id: "card-1", deck: { userId: "user-a" } },
    });
    expect(prismaMock.review.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ cardId: "card-1", rating: "GOOD", reviewedAt: expect.any(Date), nextReviewAt: expect.any(Date) }),
    });
    await app.close();
  });

  it("retorna 404 sem criar revisao para card de outro usuario", async () => {
    const [app, token] = await appWithToken();
    prismaMock.card.findFirst.mockResolvedValue(null);

    const response = await app.inject({
      method: "POST",
      url: "/cards/other/reviews",
      headers: auth(token),
      payload: { rating: "GOOD" },
    });

    expect(response.statusCode).toBe(404);
    expect(prismaMock.review.create).not.toHaveBeenCalled();
    await app.close();
  });
});
