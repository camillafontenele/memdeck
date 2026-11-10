import { describe, expect, it } from "vitest";
import { calculateNextReview } from "./calculate-next-review.js";

describe("calculateNextReview", () => {
  const reviewedAt = new Date("2026-01-10T12:00:00.000Z");

  it.each([
    ["AGAIN", 1],
    ["HARD", 1],
    ["GOOD", 2],
    ["EASY", 3],
  ] as const)("agenda %s para %i dia(s) depois", (rating, days) => {
    const result = calculateNextReview(rating, reviewedAt);
    expect(result.getTime()).toBe(reviewedAt.getTime() + days * 86_400_000);
  });

  it("não altera a data da revisão original", () => {
    calculateNextReview("GOOD", reviewedAt);
    expect(reviewedAt.toISOString()).toBe("2026-01-10T12:00:00.000Z");
  });
});
