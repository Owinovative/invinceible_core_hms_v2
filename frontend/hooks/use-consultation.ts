"use client";


import { useQuery } from "@tanstack/react-query";
import { getConsultationById } from "@/services/consultation-service";


export function useConsultation(id: number) {
  return useQuery({
    queryKey: ["consultation", id],
    queryFn: () => getConsultationById(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}
