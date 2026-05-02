"use client";

import { useQuery } from "@tanstack/react-query";
import { getShaClaimSummary } from "@/services/sha-claim-service";

export function useShaClaimSummary() {
  return useQuery({
    queryKey: ["sha-claim-summary"],
    queryFn: getShaClaimSummary,
  });
}
