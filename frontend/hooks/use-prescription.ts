"use client";

import { useQuery } from "@tanstack/react-query";
import { getPrescriptionById } from "@/services/prescription-service";

export function usePrescription(id?: number) {
  return useQuery({
    queryKey: ["pharmacy-prescription", id],
    queryFn: () => getPrescriptionById(Number(id)),
    enabled: Boolean(id),
  });
}
