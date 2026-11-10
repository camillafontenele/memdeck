import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { authGuard } from "../auth/auth-guard.js";

export async function deckRoutes(app: FastifyInstance) {
  app.post(
    "/decks",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["Decks"],
        summary: "Cria um novo deck",
        description: "Cria um novo baralho de flashcards.",

        body: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
            description: { type: "string" },
          },
        },

        security: [
          {
            bearerAuth: [],
          },
        ],

        response: {
          201: {
            description: "Deck criado com sucesso",
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              createdAt: { type: "string" },
            },
          },
        },
      },
    },

    async (request, reply) => {
      const body = request.body as { name: string; description?: string };
      const user = request.user as {
        sub: string;
        email: string;
      };

      const deck = await prisma.deck.create({
        data: {
          name: body.name,
          description: body.description,
          userId: user.sub,
        },
      });

      return reply.status(201).send(deck);
    },
  );

  app.get(
    "/decks",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["Decks"],
        summary: "Lista os decks",
        description: "Retorna os baralhos do usuário autenticado.",

        security: [
          {
            bearerAuth: [],
          },
        ],

        response: {
          200: {
            description: "Lista de decks",
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                description: { type: "string" },
                createdAt: { type: "string" },
              },
            },
          },
        },
      },
    },

    async (request) => {
      const user = request.user as {
        sub: string;
        email: string;
      };

      const decks = await prisma.deck.findMany({
        where: {
          userId: user.sub,
        },
      });

      return decks;
    },
  );

  app.patch(
    "/decks/:deckId",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["Decks"],
        summary: "Atualiza um deck",
        description: "Atualiza o nome e a descrição de um baralho do usuário autenticado.",
        params: {
          type: "object",
          required: ["deckId"],
          properties: {
            deckId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["name", "description"],
          properties: {
            name: { type: "string", minLength: 1 },
            description: { type: "string" },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
        response: {
          200: {
            description: "Deck atualizado com sucesso",
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              createdAt: { type: "string" },
            },
          },
          404: {
            description: "Deck não encontrado",
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { deckId } = request.params as { deckId: string };
      const body = request.body as { name: string; description: string };
      const user = request.user as { sub: string; email: string };

      const deck = await prisma.deck.findFirst({
        where: {
          id: deckId,
          userId: user.sub,
        },
      });

      if (!deck) {
        return reply.status(404).send({ message: "Deck não encontrado" });
      }

      const updatedDeck = await prisma.deck.update({
        where: { id: deck.id },
        data: {
          name: body.name,
          description: body.description,
        },
      });

      return reply.send(updatedDeck);
    },
  );

  app.delete(
    "/decks/:deckId",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["Decks"],
        summary: "Exclui um deck",
        description:
          "Exclui um baralho do usuário autenticado, seus cards e revisões associadas.",
        params: {
          type: "object",
          required: ["deckId"],
          properties: {
            deckId: { type: "string" },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
        response: {
          204: {
            description: "Deck excluído com sucesso",
            type: "null",
          },
          404: {
            description: "Deck não encontrado",
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { deckId } = request.params as { deckId: string };
      const user = request.user as { sub: string; email: string };

      const deck = await prisma.deck.findFirst({
        where: {
          id: deckId,
          userId: user.sub,
        },
      });

      if (!deck) {
        return reply.status(404).send({ message: "Deck não encontrado" });
      }

      await prisma.deck.delete({ where: { id: deck.id } });

      return reply.status(204).send();
    },
  );
}
