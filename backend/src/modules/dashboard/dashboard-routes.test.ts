import Fastify from "fastify";
import jwt from "@fastify/jwt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  card: { findMany: vi.fn() },
  review: { findMany: vi.fn() },
}));

vi.mock("../../lib/prisma.js", () => ({ prisma: prismaMock }));

import { dashboardRoutes } from "./dashboard-routes.js";

async function appWithToken() {
  const app = Fastify();
  await app.register(jwt, { secret: "test-secret" });
  await app.register(dashboardRoutes);
  await app.ready();
  return [app, app.jwt.sign({ sub: "user-a", email: "a@test.dev" })] as const;
}

const auth = (token: string) => ({ authorization: `Bearer ${token}` });

describe("resumo do dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-11T15:00:00.000Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("exige JWT", async () => {
    const [app] = await appWithToken();
    const response = await app.inject({ method: "GET", url: "/dashboard/summary" });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("calcula cards e revisoes disponiveis com a regra de disponibilidade", async () => {
    const [app, token] = await appWithToken();
    prismaMock.card.findMany.mockResolvedValue([
      { id: "new", reviews: [] },
      { id: "due", reviews: [{ nextReviewAt: new Date("2026-11-11T14:00:00.000Z") }] },
      { id: "future", reviews: [{ nextReviewAt: new Date("2026-11-11T16:00:00.000Z") }] },
    ]);
    prismaMock.review.findMany.mockResolvedValue([
      { reviewedAt: new Date("2026-11-10T15:00:00.000Z") },
      { reviewedAt: new Date("2026-11-09T15:00:00.000Z") },
    ]);

    const response = await app.inject({
      method: "GET",
      url: "/dashboard/summary",
      headers: auth(token),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      cardsCount: 3,
      dueReviewsCount: 2,
      studyStreakDays: 2,
    });
    await app.close();
  });

  it("consulta somente cards e revisoes dos decks do usuario autenticado", async () => {
    const [app, token] = await appWithToken();
    prismaMock.card.findMany.mockResolvedValue([]);
    prismaMock.review.findMany.mockResolvedValue([]);

    await app.inject({ method: "GET", url: "/dashboard/summary", headers: auth(token) });

    expect(prismaMock.card.findMany).toHaveBeenCalledWith({
      where: { deck: { userId: "user-a" } },
      include: { reviews: { orderBy: { reviewedAt: "desc" }, take: 1 } },
    });
    expect(prismaMock.review.findMany).toHaveBeenCalledWith({
      where: { card: { deck: { userId: "user-a" } } },
      select: { reviewedAt: true },
    });
    await app.close();
  });

  it("retorna zeros quando o usuario nao possui cards ou revisoes", async () => {
    const [app, token] = await appWithToken();
    prismaMock.card.findMany.mockResolvedValue([]);
    prismaMock.review.findMany.mockResolvedValue([]);

    const response = await app.inject({ method: "GET", url: "/dashboard/summary", headers: auth(token) });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ cardsCount: 0, dueReviewsCount: 0, studyStreakDays: 0 });
    await app.close();
  });
});
