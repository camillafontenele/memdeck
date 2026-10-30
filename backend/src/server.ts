import Fastify from "fastify";
import { deckRoutes } from "./modules/decks/deck-routes.js";
import { cardRoutes } from "./modules/cards/card-routes.js";
import { reviewRoutes } from "./modules/reviews/review-routes.js";
import { authRoutes } from "./modules/auth/auth-routes.js";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import jwt from "@fastify/jwt";
import cors from "@fastify/cors";

const app = Fastify({
  logger: true,
});

await app.register(swagger, {
  openapi: {
    info: {
      title: "MemDeck API",
      description: "API para gerenciamento de decks, cards e revisões com SRS.",
      version: "1.0.0",
    },

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
});

await app.register(swaggerUi, {
  routePrefix: "/docs",
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET ?? "dev-secret",
});

await app.register(cors, {
  origin: /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

app.get(
  "/health",
  {
    schema: {
      tags: ["Health"],
      summary: "Verifica o status da API",
      description: "Retorna uma mensagem indicando que a API está funcionando.",
    },
  },
  async () => {
    return {
      message: "MemDeck Api funcionando",
    };
  },
);

app.register(authRoutes);
app.register(deckRoutes);
app.register(cardRoutes);
app.register(reviewRoutes);

app.listen({ port: 3333 });
