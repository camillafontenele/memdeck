import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { prisma } from "../../lib/prisma.js";
import { google } from "googleapis";
import { authGuard } from "./auth-guard.js";

export async function authRoutes(app: FastifyInstance) {
  app.get("/auth/me", {
    preHandler: [authGuard],
    schema: {
      tags: ["Auth"],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
          },
        },
        401: {
          type: "object",
          properties: { message: { type: "string" } },
        },
      },
    },
  }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: { id: true, name: true, email: true },
    });
    if (!user) return reply.status(401).send({ message: "Sessão inválida." });
    return user;
  });

  const tokenExpiresIn = process.env.JWT_EXPIRES_IN ?? "7d";

  app.post(
    "/auth/register",
    {
      schema: {
        tags: ["Auth"],
        summary: "Registra um novo usuário",
        description:
          "Cria um novo usuário e retorna um token JWT para autenticação.",
        body: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
          },
        },
        response: {
          201: {
            description: "Usuário criado com sucesso",
            type: "object",
            properties: {
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                },
              },
              token: { type: "string" },
            },
          },
          409: {
            description: "E-mail já cadastrado",
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },

    async (request, reply) => {
      const body = request.body as {
        name: string;
        email: string;
        password: string;
      };

      const existingUser = await prisma.user.findUnique({
        where: {
          email: body.email,
        },
      });

      if (existingUser) {
        return reply.status(409).send({
          message: "E-mail já cadastrado",
        });
      }

      const passwordHash = await argon2.hash(body.password);

      const user = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          passwordHash,
        },
      });

      const token = app.jwt.sign(
        {
          sub: user.id,
          email: user.email,
        },
        {
          expiresIn: tokenExpiresIn,
        },
      );

      return reply.status(201).send({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        token,
      });
    },
  );

  app.post(
    "/auth/login",
    {
      schema: {
        tags: ["Auth"],
        summary: "Autentica um usuário",
        description:
          "Autentica um usuário com e-mail e senha e retorna um token JWT.",

        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
            },
            password: {
              type: "string",
            },
          },
        },

        response: {
          200: {
            description: "Login realizado com sucesso",
            type: "object",
            properties: {
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                },
              },
              token: { type: "string" },
            },
          },

          401: {
            description: "E-mail ou senha inválidos",
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        email: string;
        password: string;
      };

      const user = await prisma.user.findUnique({
        where: {
          email: body.email,
        },
      });

      if (!user || !user.passwordHash) {
        return reply.status(401).send({
          message: "E-mail ou senha inválidos",
        });
      }

      const passwordIsValid = await argon2.verify(
        user.passwordHash,
        body.password,
      );

      if (!passwordIsValid) {
        return reply.status(401).send({
          message: "E-mail ou senha inválidos",
        });
      }

      const token = app.jwt.sign(
        {
          sub: user.id,
          email: user.email,
        },
        {
          expiresIn: tokenExpiresIn,
        },
      );

      return reply.status(200).send({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        token,
      });
    },
  );

  const googleOAuthConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI,
  );
  const googleOAuthClient = googleOAuthConfigured
    ? new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI,
      )
    : null;

  app.get("/auth/google", async (_request, reply) => {
    if (!googleOAuthClient) {
      return reply.status(503).send({
        message: "Autenticação com Google não está configurada.",
      });
    }

    const authorizationUrl = googleOAuthClient.generateAuthUrl({
      access_type: "online",
      scope: ["openid", "email", "profile"],
    });

    return reply.redirect(authorizationUrl);
  });

  app.get("/auth/google/callback", async (request, reply) => {
    if (!googleOAuthClient) {
      return reply.status(503).send({
        message: "Autenticação com Google não está configurada.",
      });
    }

    const { code } = request.query as {
      code?: string;
    };

    if (!code) {
      return reply.status(400).send({
        message: "Código de autorização não informado",
      });
    }

    const { tokens } = await googleOAuthClient.getToken(code);

    googleOAuthClient.setCredentials(tokens);

    const oauth2 = google.oauth2({
      version: "v2",
      auth: googleOAuthClient,
    });

    const { data: googleUser } = await oauth2.userinfo.get();

    if (!googleUser.email) {
      return reply.status(400).send({
        message: "Não foi possível obter o e-mail da conta Google",
      });
    }

    let user = await prisma.user.findUnique({
      where: {
        email: googleUser.email,
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: googleUser.name ?? "Usuário",
          email: googleUser.email,
          googleId: googleUser.id,
        },
      });
    } else if (!user.googleId && googleUser.id) {
      user = await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          googleId: googleUser.id,
        },
      });
    }

    const token = app.jwt.sign(
      {
        sub: user.id,
        email: user.email,
      },
      {
        expiresIn: tokenExpiresIn,
      },
    );

    return reply.send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      token,
    });
  });
}
