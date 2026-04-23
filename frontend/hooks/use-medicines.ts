"use client";


import { useQuery } from "@tanstack/react-query";
import { getMedicines } from "@/services/medicine-service";


export function useMedicines() {
  return useQuery({
    queryKey: ["medicines"],
    queryFn: getMedicines,
  });
}
