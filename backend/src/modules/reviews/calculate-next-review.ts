import type { ReviewRating } from "./review.js";

export function calculateNextReview(
    rating: ReviewRating,
    reviewedAt: Date
): Date {
    const nextReview = new Date(reviewedAt);

    switch (rating) {
        case "AGAIN":
            nextReview.setDate(nextReview.getDate() + 1)
            break;
        case "HARD":
            nextReview.setDate(nextReview.getDate() + 1);
            break;
        case "GOOD":
            nextReview.setDate(nextReview.getDate() + 2);
            break;
        case "EASY":
            nextReview.setDate(nextReview.getDate() + 3);
            break;
    }

    return nextReview;  
}
