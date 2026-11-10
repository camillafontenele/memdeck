import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import jwt from "@fastify/jwt";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  deck: {
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../../lib/prisma.js", () => ({ prisma: prismaMock }));

import { deckRoutes } from "./deck-routes.js";

async function createApp() {
  const app = Fastify();
  await app.register(jwt, { secret: "test-secret" });
  await app.register(deckRoutes);
  await app.ready();
  return app;
}

describe("DELETE /decks/:deckId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exige autenticação", async () => {
    const app = await createApp();

    const response = await app.inject({
      method: "DELETE",
      url: "/decks/deck-1",
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("retorna 404 quando o deck não pertence ao usuário autenticado", async () => {
    prismaMock.deck.findFirst.mockResolvedValue(null);
    const app = await createApp();
    const token = app.jwt.sign({ sub: "user-a", email: "a@memdeck.dev" });

    const response = await app.inject({
      method: "DELETE",
      url: "/decks/deck-other-user",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(404);
    expect(prismaMock.deck.findFirst).toHaveBeenCalledWith({
      where: { id: "deck-other-user", userId: "user-a" },
    });
    expect(prismaMock.deck.delete).not.toHaveBeenCalled();
    await app.close();
  });

  it("exclui o deck autorizado e retorna 204 sem conteúdo", async () => {
    prismaMock.deck.findFirst.mockResolvedValue({ id: "deck-1" });
    prismaMock.deck.delete.mockResolvedValue({ id: "deck-1" });
    const app = await createApp();
    const token = app.jwt.sign({ sub: "user-a", email: "a@memdeck.dev" });

    const response = await app.inject({
      method: "DELETE",
      url: "/decks/deck-1",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
    expect(prismaMock.deck.delete).toHaveBeenCalledWith({
      where: { id: "deck-1" },
    });
    await app.close();
  });

  it("declara cascata de deck para cards e de cards para revisões", async () => {
    const schemaPath = fileURLToPath(
      new URL("../../../prisma/schema.prisma", import.meta.url),
    );
    const schema = await readFile(schemaPath, "utf8");

    expect(schema).toMatch(
      /deck\s+Deck\s+@relation\(fields: \[deckId\], references: \[id\], onDelete: Cascade\)/,
    );
    expect(schema).toMatch(
      /card\s+Card\s+@relation\(fields: \[cardId\], references: \[id\], onDelete: Cascade\)/,
    );
  });
});
