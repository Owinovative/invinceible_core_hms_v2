"use client";

import { useQuery } from "@tanstack/react-query";
import { getPharmacyPrescriptionById } from "@/services/pharmacy-service";

export function usePrescriptionById(id?: number | null) {
  return useQuery({
    queryKey: ["prescription-by-id", id],
    queryFn: () => getPharmacyPrescriptionById(id as number),
    enabled: !!id,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
}
