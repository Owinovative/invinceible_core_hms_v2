import { apiFetch } from "@/lib/api";

export interface PublicUserReview {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  reviewer: {
    username?: string | null;
    name: string;
    roleCode?: string | null;
    photoUrl?: string | null;
    designation?: string | null;
  };
}

export interface PublicReviewsResponse {
  summary: {
    averageRating: number;
    reviewCount: number;
    minimumLoginCount: number;
  };
  reviews: PublicUserReview[];
}

export interface MyReviewStatus {
  canReview: boolean;
  loginCount: number;
  remainingLogins: number;
  minimumLoginCount: number;
  review: PublicUserReview | null;
}

export interface SaveReviewPayload {
  rating: number;
  comment: string;
}

export function getPublicReviews() {
  return apiFetch<PublicReviewsResponse>("/reviews/public");
}

export function getMyReviewStatus() {
  return apiFetch<MyReviewStatus>("/reviews/me");
}

export function saveMyReview(payload: SaveReviewPayload) {
  return apiFetch<{ message: string; review: PublicUserReview }>("/reviews/me", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
