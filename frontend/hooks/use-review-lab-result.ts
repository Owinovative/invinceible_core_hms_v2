"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  amendLabResult,
  releaseLabResult,
  validateLabResult,
} from "@/services/lab-service";

function useReviewMutation<T>(mutationFn: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["lab-results"] });
      await client.invalidateQueries({ queryKey: ["lab-queue"] });
      await client.invalidateQueries({ queryKey: ["patient-portal"] });
    },
  });
}

export function useValidateLabResult() {
  return useReviewMutation(validateLabResult);
}

export function useReleaseLabResult() {
  return useReviewMutation(releaseLabResult);
}

export function useAmendLabResult() {
  return useReviewMutation(amendLabResult);
}
