"use client";

import { useQuery } from "@tanstack/react-query";
import { getPharmacyMedicines } from "@/services/pharmacy-service";

export function usePharmacyMedicines() {
  return useQuery({
    queryKey: ["pharmacy-medicines"],
    queryFn: getPharmacyMedicines,
  });
}
