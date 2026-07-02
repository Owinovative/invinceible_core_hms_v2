"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Loader2,
  MessageSquareText,
  Star,
  UserRound,
} from "lucide-react";
import { PublicSiteHeader } from "@/components/public/public-site-header";
import { useAuth } from "@/providers/auth-provider";
import {
  getMyReviewStatus,
  getPublicReviews,
  saveMyReview,
  type PublicUserReview,
} from "@/services/review-service";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-1 text-module">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`${size} ${index < value ? "fill-sky-600" : "fill-none text-muted-foreground"}`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: PublicUserReview }) {
  return (
    <article className="border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-4">
        {review.reviewer.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={review.reviewer.photoUrl}
            alt=""
            className="h-14 w-14 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-2 text-sm font-bold text-module">
            {initials(review.reviewer.name) || <UserRound className="h-5 w-5" />}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="truncate font-semibold text-foreground">
                {review.reviewer.name}
              </h3>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {review.reviewer.designation ||
                  review.reviewer.roleCode ||
                  review.reviewer.username}
              </p>
            </div>
            <Stars value={review.rating} />
          </div>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            {review.comment}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);

  const publicReviewsQuery = useQuery({
    queryKey: ["public-reviews"],
    queryFn: getPublicReviews,
  });

  const myReviewQuery = useQuery({
    queryKey: ["my-review-status"],
    queryFn: getMyReviewStatus,
    enabled: isAuthenticated,
  });

  React.useEffect(() => {
    const existing = myReviewQuery.data?.review;
    if (!existing) return;
    setRating(existing.rating);
    setComment(existing.comment);
  }, [myReviewQuery.data?.review]);

  const saveReviewMutation = useMutation({
    mutationFn: saveMyReview,
    onSuccess: (result) => {
      setMessage(result.message);
      queryClient.invalidateQueries({ queryKey: ["public-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["my-review-status"] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Unable to save review.");
    },
  });

  const summary = publicReviewsQuery.data?.summary;
  const reviews = publicReviewsQuery.data?.reviews ?? [];
  const canReview = myReviewQuery.data?.canReview;

  return (
    <main className="min-h-screen bg-[#f6fbff] text-foreground">
      <PublicSiteHeader />

      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-[1500px] gap-8 px-5 py-12 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 border border-border bg-surface-2 px-3 py-2 text-sm font-semibold text-module">
              <MessageSquareText className="h-4 w-4" />
              User ratings and comments
            </div>
            <div>
              <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight md:text-7xl">
                Reviews from the people using the HMS.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                Staff can review the system after five successful logins. One
                user keeps one review, with the name and staff photo shown where
                available.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border border-border bg-[#f7fcff] p-5">
                <p className="text-4xl font-bold text-module">
                  {summary?.averageRating?.toFixed(1) ?? "0.0"}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase text-muted-foreground">
                  Average rating
                </p>
              </div>
              <div className="border border-border bg-[#f7fcff] p-5">
                <p className="text-4xl font-bold text-module">
                  {summary?.reviewCount ?? 0}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase text-muted-foreground">
                  Reviews
                </p>
              </div>
              <div className="border border-border bg-[#f7fcff] p-5">
                <p className="text-4xl font-bold text-module">
                  {summary?.minimumLoginCount ?? 5}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase text-muted-foreground">
                  Logins needed
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div
              className="min-h-[390px] border border-border bg-cover bg-center shadow-xl"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=88')",
              }}
            />
            <div
              className="min-h-[390px] border border-border bg-cover bg-center shadow-xl"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1200&q=88')",
              }}
            />
          </div>
        </div>
      </section>

      <section className="bg-[#eaf7ff]">
        <div className="mx-auto grid max-w-[1500px] gap-8 px-5 py-12 md:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="border border-border bg-card p-6 shadow-sm">
            <h2 className="text-2xl font-bold">Add your review</h2>

            {!isAuthenticated ? (
              <div className="mt-5 space-y-4">
                <p className="text-sm leading-7 text-muted-foreground">
                  Sign in first, then return here after five successful logins
                  to leave a rating.
                </p>
                <Button asChild className="rounded-md bg-primary text-white hover:bg-brand-strong">
                  <Link href="/login">
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <div className="border border-border bg-surface-2 p-4 text-sm leading-7 text-foreground">
                  <b>{user?.username}</b>{" "}
                  {canReview
                    ? "can submit or update one public review."
                    : `needs ${myReviewQuery.data?.remainingLogins ?? 0} more login(s) before reviewing.`}
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold">Rating</p>
                  <div className="flex gap-2">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const value = index + 1;
                      return (
                        <button
                          key={value}
                          type="button"
                          className="border border-border bg-card p-2 text-module hover:bg-surface-2 disabled:opacity-50"
                          onClick={() => setRating(value)}
                          disabled={!canReview}
                          aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
                        >
                          <Star
                            className={`h-6 w-6 ${value <= rating ? "fill-sky-600" : ""}`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold">Comment</p>
                  <Textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    disabled={!canReview}
                    className="min-h-[150px] rounded-md border-border bg-card"
                    placeholder="Write a clear review of your experience using the system."
                  />
                </div>

                {message ? (
                  <p className="border border-border bg-surface-2 px-3 py-2 text-sm text-foreground">
                    {message}
                  </p>
                ) : null}

                <Button
                  type="button"
                  className="rounded-md bg-primary text-white hover:bg-brand-strong"
                  disabled={!canReview || saveReviewMutation.isPending}
                  onClick={() =>
                    saveReviewMutation.mutate({
                      rating,
                      comment,
                    })
                  }
                >
                  {saveReviewMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Save review
                </Button>
              </div>
            )}
          </aside>

          <div className="grid gap-4 xl:grid-cols-2">
            {publicReviewsQuery.isLoading ? (
              <div className="border border-border bg-card p-5 text-sm text-muted-foreground">
                Loading reviews...
              </div>
            ) : reviews.length ? (
              reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))
            ) : (
              <div className="border border-border bg-card p-7">
                <Stars value={5} size="h-5 w-5" />
                <h2 className="mt-4 text-2xl font-bold">
                  No public reviews yet.
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  The first eligible staff review will appear here with their
                  name, photo, rating, and comment.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
