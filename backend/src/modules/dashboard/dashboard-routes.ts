import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { authGuard } from "../auth/auth-guard.js";
import { isReviewAvailable } from "../reviews/review-availability.js";

const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

function dateInSaoPaulo(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function previousDay(date: string) {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() - 1);
  return result.toISOString().slice(0, 10);
}

export function calculateStudyStreak(reviewedAt: Date[], now = new Date()) {
  const studyDays = new Set(reviewedAt.map(dateInSaoPaulo));
  const today = dateInSaoPaulo(now);
  let day = studyDays.has(today) ? today : previousDay(today);

  if (!studyDays.has(day)) {
    return 0;
  }

  let streak = 0;
  while (studyDays.has(day)) {
    streak += 1;
    day = previousDay(day);
  }

  return streak;
}

export async function dashboardRoutes(app: FastifyInstance) {
  app.get(
    "/dashboard/summary",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["Dashboard"],
        summary: "Retorna o resumo de estudos do usuário",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            required: ["cardsCount", "dueReviewsCount", "studyStreakDays"],
            properties: {
              cardsCount: { type: "integer", minimum: 0 },
              dueReviewsCount: { type: "integer", minimum: 0 },
              studyStreakDays: { type: "integer", minimum: 0 },
            },
          },
        },
      },
    },
    async (request) => {
      const user = request.user as { sub: string };
      const now = new Date();
      const [cards, reviews] = await Promise.all([
        prisma.card.findMany({
          where: { deck: { userId: user.sub } },
          include: {
            reviews: {
              orderBy: { reviewedAt: "desc" },
              take: 1,
            },
          },
        }),
        prisma.review.findMany({
          where: { card: { deck: { userId: user.sub } } },
          select: { reviewedAt: true },
        }),
      ]);

      return {
        cardsCount: cards.length,
        dueReviewsCount: cards.filter((card) =>
          isReviewAvailable(card.reviews[0], now),
        ).length,
        studyStreakDays: calculateStudyStreak(
          reviews.map((review) => review.reviewedAt),
          now,
        ),
      };
    },
  );
}
