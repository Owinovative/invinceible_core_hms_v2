"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFeedback,
  getMyFeedback,
  getPlatformFeedback,
  replyToFeedback,
  type CreateFeedbackPayload,
  type ReplyFeedbackPayload,
} from "@/services/feedback-service";

export function useMyFeedback() {
  return useQuery({
    queryKey: ["feedback", "mine"],
    queryFn: getMyFeedback,
  });
}

export function usePlatformFeedback() {
  return useQuery({
    queryKey: ["feedback", "platform"],
    queryFn: getPlatformFeedback,
    refetchInterval: 30000,
  });
}

export function useCreateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFeedbackPayload) => createFeedback(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    },
  });
}

export function useReplyFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: ReplyFeedbackPayload;
    }) => replyToFeedback(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
