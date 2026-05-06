"use client";


import { useQuery } from "@tanstack/react-query";
import { queryStaleTime } from "@/lib/query-stale-times";
import { getMedicines } from "@/services/medicine-service";


export function useMedicines() {
  return useQuery({
    queryKey: ["medicines"],
    queryFn: getMedicines,
    staleTime: queryStaleTime.medicineCatalog,
  });
}
