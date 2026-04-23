"use client";

import { useQuery } from "@tanstack/react-query";
import { getPharmacyPrescriptionById } from "@/services/pharmacy-service";

export function usePharmacyPrescription(id?: number) {
  return useQuery({
    queryKey: ["pharmacy-prescription", id],
    queryFn: () => getPharmacyPrescriptionById(Number(id)),
    enabled: !!id,
  });
}
