"use client";

import { useQuery } from "@tanstack/react-query";
import { getConsultationWorkspace } from "@/services/consultation-service";

export function useConsultationWorkspace(id: number) {
  return useQuery({
    queryKey: ["consultation-workspace", id],
    queryFn: () => getConsultationWorkspace(id),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 15_000,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
  });
}
