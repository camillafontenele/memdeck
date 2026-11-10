import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { authGuard } from "../auth/auth-guard.js";
import { validateCard } from "./card-validation.js";

const cardSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    deckId: { type: "string" },
    front: { type: "string" },
    back: { type: "string" },
    createdAt: { type: "string" },
  },
};

const errorSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
};

export async function cardRoutes(app: FastifyInstance) {
  app.post(
    "/decks/:deckId/cards",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["Cards"],
        summary: "Cria um novo card",
        description: "Adiciona um novo flashcard a um deck existente.",
        params: {
          type: "object",
          required: ["deckId"],
          properties: { deckId: { type: "string" } },
        },
        body: {
          type: "object",
          required: ["front", "back"],
          properties: {
            front: { type: "string" },
            back: { type: "string" },
          },
        },
        security: [{ bearerAuth: [] }],
        response: {
          201: { description: "Card criado com sucesso", ...cardSchema },
          400: { description: "Dados inválidos", ...errorSchema },
          404: { description: "Deck não encontrado", ...errorSchema },
        },
      },
    },
    async (request, reply) => {
      const user = request.user as { sub: string; email: string };
      const { deckId } = request.params as { deckId: string };
      const body = request.body as { front: string; back: string };

      if (!validateCard(body.front, body.back)) {
        return reply.status(400).send({
          message: "A frente e o verso do card são obrigatórios.",
        });
      }

      const deck = await prisma.deck.findFirst({
        where: { id: deckId, userId: user.sub },
      });

      if (!deck) {
        return reply.status(404).send({ message: "Deck não encontrado" });
      }

      const card = await prisma.card.create({
        data: {
          deckId,
          front: body.front.trim(),
          back: body.back.trim(),
        },
      });

      return reply.status(201).send(card);
    },
  );

  app.get(
    "/decks/:deckId/cards",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["Cards"],
        summary: "Lista os cards de um deck",
        description: "Retorna todos os flashcards pertencentes a um deck.",
        params: {
          type: "object",
          required: ["deckId"],
          properties: { deckId: { type: "string" } },
        },
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "Lista de cards do deck",
            type: "array",
            items: cardSchema,
          },
          404: { description: "Deck não encontrado", ...errorSchema },
        },
      },
    },
    async (request, reply) => {
      const user = request.user as { sub: string; email: string };
      const { deckId } = request.params as { deckId: string };

      const deck = await prisma.deck.findFirst({
        where: { id: deckId, userId: user.sub },
      });

      if (!deck) {
        return reply.status(404).send({ message: "Deck não encontrado" });
      }

      return prisma.card.findMany({ where: { deckId } });
    },
  );

  app.patch(
    "/cards/:cardId",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["Cards"],
        summary: "Atualiza um card",
        description:
          "Atualiza a frente e o verso de um flashcard do usuário autenticado.",
        params: {
          type: "object",
          required: ["cardId"],
          properties: { cardId: { type: "string" } },
        },
        body: {
          type: "object",
          required: ["front", "back"],
          properties: {
            front: { type: "string" },
            back: { type: "string" },
          },
        },
        security: [{ bearerAuth: [] }],
        response: {
          200: { description: "Card atualizado com sucesso", ...cardSchema },
          400: { description: "Dados inválidos", ...errorSchema },
          404: { description: "Card não encontrado", ...errorSchema },
        },
      },
    },
    async (request, reply) => {
      const user = request.user as { sub: string; email: string };
      const { cardId } = request.params as { cardId: string };
      const body = request.body as { front: string; back: string };

      if (!validateCard(body.front, body.back)) {
        return reply.status(400).send({
          message: "A frente e o verso do card são obrigatórios.",
        });
      }

      const card = await prisma.card.findFirst({
        where: {
          id: cardId,
          deck: { userId: user.sub },
        },
      });

      if (!card) {
        return reply.status(404).send({ message: "Card não encontrado" });
      }

      const updatedCard = await prisma.card.update({
        where: { id: card.id },
        data: {
          front: body.front.trim(),
          back: body.back.trim(),
        },
      });

      return reply.status(200).send(updatedCard);
    },
  );

  app.delete(
    "/cards/:cardId",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["Cards"],
        summary: "Exclui um card",
        description:
          "Exclui um flashcard do usuário autenticado e suas revisões associadas.",
        params: {
          type: "object",
          required: ["cardId"],
          properties: { cardId: { type: "string" } },
        },
        security: [{ bearerAuth: [] }],
        response: {
          204: { description: "Card excluído com sucesso", type: "null" },
          404: { description: "Card não encontrado", ...errorSchema },
        },
      },
    },
    async (request, reply) => {
      const user = request.user as { sub: string; email: string };
      const { cardId } = request.params as { cardId: string };

      const card = await prisma.card.findFirst({
        where: {
          id: cardId,
          deck: { userId: user.sub },
        },
      });

      if (!card) {
        return reply.status(404).send({ message: "Card não encontrado" });
      }

      await prisma.card.delete({ where: { id: card.id } });

      return reply.status(204).send();
    },
  );
}
