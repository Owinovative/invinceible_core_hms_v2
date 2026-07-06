import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  checkShaEligibility,
  getDhaStatus,
  getDhaTransactions,
  type CheckEligibilityPayload,
  type DhaQueueStat,
  type DhaStatus,
  type DhaTransaction,
  type EligibilityResult,
} from "@/services/dha-service";

// ─── Eligibility check (mutation — user-triggered) ───────────────────────────

export function useCheckShaEligibility() {
  return useMutation<EligibilityResult, Error, CheckEligibilityPayload>({
    mutationFn: checkShaEligibility,
  });
}

// ─── DHA Status ──────────────────────────────────────────────────────────────

export function useDhaStatus() {
  return useQuery<DhaStatus>({
    queryKey: ["dha", "status"],
    queryFn: getDhaStatus,
    refetchInterval: 30_000,
    retry: false,
  });
}

// ─── DHA Transactions ─────────────────────────────────────────────────────────

export function useDhaTransactions(params?: {
  patientId?: number;
  transactionType?: string;
  limit?: number;
}) {
  return useQuery<DhaTransaction[]>({
    queryKey: ["dha", "transactions", params],
    queryFn: () => getDhaTransactions(params),
    refetchInterval: 15_000,
  });
}

// ─── Integration Stats (queue health) ────────────────────────────────────────

export function useIntegrationStats() {
  return useQuery<DhaQueueStat[]>({
    queryKey: ["integration", "stats"],
    queryFn: async () => {
      const status = await getDhaStatus();
      return status.queue ?? [];
    },
    refetchInterval: 20_000,
    retry: false,
  });
}
