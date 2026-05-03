"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyFacilitySubscriptionStatus,
  getPlatformFacilitySubscriptions,
  recordFacilitySubscriptionPayment,
  type RecordFacilitySubscriptionPaymentPayload,
} from "@/services/facility-subscription-service";

export function useMyFacilitySubscriptionStatus(enabled = true) {
  return useQuery({
    queryKey: ["facility-subscription", "mine"],
    queryFn: getMyFacilitySubscriptionStatus,
    enabled,
    refetchInterval: 15000,
  });
}

export function usePlatformFacilitySubscriptions() {
  return useQuery({
    queryKey: ["facility-subscription", "platform"],
    queryFn: getPlatformFacilitySubscriptions,
    refetchInterval: 30000,
  });
}

export function useRecordFacilitySubscriptionPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RecordFacilitySubscriptionPaymentPayload) =>
      recordFacilitySubscriptionPayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
    },
  });
}
