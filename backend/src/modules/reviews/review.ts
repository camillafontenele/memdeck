export type ReviewRating = "AGAIN" | "HARD" | "GOOD" | "EASY"

export interface Review {
  id: string;
  cardId: string;
  rating: ReviewRating;
  reviewedAt: Date;
  nextReviewAt: Date;
}
