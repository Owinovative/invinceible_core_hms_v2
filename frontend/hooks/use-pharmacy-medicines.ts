"use client";

import { useQuery } from "@tanstack/react-query";
import { queryStaleTime } from "@/lib/query-stale-times";
import { getPharmacyMedicines } from "@/services/pharmacy-service";

export function usePharmacyMedicines() {
  return useQuery({
    queryKey: ["pharmacy-medicines"],
    queryFn: getPharmacyMedicines,
    staleTime: queryStaleTime.medicineCatalog,
  });
}
