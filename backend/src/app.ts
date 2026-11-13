import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import jwt from "@fastify/jwt";
import cors from "@fastify/cors";
import { deckRoutes } from "./modules/decks/deck-routes.js";
import { cardRoutes } from "./modules/cards/card-routes.js";
import { reviewRoutes } from "./modules/reviews/review-routes.js";
import { authRoutes } from "./modules/auth/auth-routes.js";
import { dashboardRoutes } from "./modules/dashboard/dashboard-routes.js";
import { safeLogger } from "./modules/auth/auth-security.js";

export async function buildApp() {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET deve ser definida.");
  }

  const configuredCorsOrigins = process.env.CORS_ORIGIN;

  if (process.env.NODE_ENV === "production" && !configuredCorsOrigins) {
    throw new Error("CORS_ORIGIN deve ser definida em produção.");
  }

  const corsOrigins = (configuredCorsOrigins
    ? configuredCorsOrigins.split(",")
    : ["http://localhost:5173", "http://127.0.0.1:5173"]
  ).map((origin) => origin.trim()).filter(Boolean);

  const app = Fastify({
    logger: safeLogger,
    trustProxy: process.env.TRUSTED_PROXIES?.split(",").map(value => value.trim()).filter(Boolean) ?? false,
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

  await app.register(swaggerUi, { routePrefix: "/docs" });
  await app.register(jwt, { secret: jwtSecret });
  await app.register(cors, {
    origin: corsOrigins,
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
    async () => ({ message: "MemDeck Api funcionando" }),
  );

  await app.register(authRoutes);
  await app.register(deckRoutes);
  await app.register(cardRoutes);
  await app.register(reviewRoutes);
  await app.register(dashboardRoutes);

  return app;
}
