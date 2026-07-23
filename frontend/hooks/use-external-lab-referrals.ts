"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createExternalLabReferral,
  createExternalLabResult,
  getExternalLabReferrals,
  releaseExternalLabResult,
  validateExternalLabResult,
  createExternalLabPayment,
  createExternalLabReportShare,
} from "@/services/lab-service";

export function useExternalLabReferrals() {
  return useQuery({
    queryKey: ["lab", "external-referrals"],
    queryFn: getExternalLabReferrals,
  });
}

export function useCreateExternalLabReferral() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createExternalLabReferral,
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: ["lab", "external-referrals"],
      });
    },
  });
}

function useExternalResultMutation<T>(
  mutationFn: (input: T) => Promise<unknown>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["lab", "external-referrals"] }),
  });
}

export function useCreateExternalLabResult() {
  return useExternalResultMutation(createExternalLabResult);
}

export function useValidateExternalLabResult() {
  return useExternalResultMutation(validateExternalLabResult);
}

export function useReleaseExternalLabResult() {
  return useExternalResultMutation(releaseExternalLabResult);
}

export function useCreateExternalLabPayment() {
  return useExternalResultMutation(createExternalLabPayment);
}

export function useCreateExternalLabReportShare() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createExternalLabReportShare,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["lab", "external-referrals"] }),
  });
}
