"use client";

import { useQuery } from "@tanstack/react-query";
import { getClinics } from "@/services/clinic-service";

export function useClinics() {
  return useQuery({
    queryKey: ["clinics"],
    queryFn: getClinics,
  });
}
