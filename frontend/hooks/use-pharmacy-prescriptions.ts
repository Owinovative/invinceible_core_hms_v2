"use client";

import { useQuery } from "@tanstack/react-query";
import { getPrescriptions } from "@/services/prescription-service";

export function usePharmacyPrescriptions() {
  return useQuery({
    queryKey: ["pharmacy-prescriptions"],
    queryFn: getPrescriptions,
  });
}
