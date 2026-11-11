type LastReview = {
  nextReviewAt: Date;
};

export function isReviewAvailable(
  lastReview: LastReview | undefined,
  now = new Date(),
) {
  return !lastReview || lastReview.nextReviewAt <= now;
}
