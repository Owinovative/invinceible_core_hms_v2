"use client";


import { useQuery } from "@tanstack/react-query";
import { getAdmissionById } from "@/services/ipd-service";


export function useAdmission(id?: number) {
  return useQuery({
    queryKey: ["ipd-admission", id],
    queryFn: () => getAdmissionById(Number(id)),
    enabled: Boolean(id),
  });
}
