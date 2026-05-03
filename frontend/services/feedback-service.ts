import { apiFetch } from "@/lib/api";

export interface FeedbackRecord {
  id: number;
  subject: string;
  message: string;
  isAnonymous: boolean;
  statusCode: string;
  replyText?: string | null;
  repliedAt?: string | null;
  createdAt?: string;
  facilityId?: number | null;
  branchId?: number | null;
  displayName?: string | null;
  displayPhotoUrl?: string | null;
  facility?: { id: number; name?: string | null } | null;
  branch?: { id: number; name?: string | null } | null;
  createdByUser?: {
    id: number;
    username?: string | null;
    fullName?: string | null;
    staff?: { passportPhotoUrl?: string | null } | null;
  } | null;
  repliedByUser?: {
    id: number;
    username?: string | null;
    fullName?: string | null;
  } | null;
}

export interface CreateFeedbackPayload {
  subject: string;
  message: string;
  isAnonymous?: boolean;
}

export interface ReplyFeedbackPayload {
  replyText: string;
  statusCode?: "OPEN" | "REPLIED" | "CLOSED";
}

export function createFeedback(payload: CreateFeedbackPayload) {
  return apiFetch<FeedbackRecord>("/feedback", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMyFeedback() {
  return apiFetch<FeedbackRecord[]>("/feedback/mine", { method: "GET" });
}

export function getPlatformFeedback() {
  return apiFetch<FeedbackRecord[]>("/feedback/platform", { method: "GET" });
}

export function replyToFeedback(id: number, payload: ReplyFeedbackPayload) {
  return apiFetch<FeedbackRecord>(`/feedback/${id}/reply`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
