"use client";

import { useQuery } from "@tanstack/react-query";
import { getLowPharmacyStock } from "@/services/pharmacy-stock-service";

export function useLowPharmacyStock() {
  return useQuery({
    queryKey: ["low-pharmacy-stock"],
    queryFn: getLowPharmacyStock,
  });
}
