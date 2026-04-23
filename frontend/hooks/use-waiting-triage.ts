"use client";

import { useQuery } from "@tanstack/react-query";
import { getWaitingTriage } from "@/services/triage-service";

export function useWaitingTriage() {
  return useQuery({
    queryKey: ["triage", "waiting"],
    queryFn: getWaitingTriage,
  });
}
