"use client";

import { useQuery } from "@tanstack/react-query";
import { getConsultations } from "@/services/consultation-service";

export function useConsultations() {
  return useQuery({
    queryKey: ["consultations"],
    queryFn: getConsultations,
  });
}
