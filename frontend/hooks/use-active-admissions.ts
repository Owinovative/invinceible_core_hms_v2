"use client";


import { useQuery } from "@tanstack/react-query";
import { getActiveAdmissions } from "@/services/ipd-service";


export function useActiveAdmissions() {
  return useQuery({
    queryKey: ["ipd-active-admissions"],
    queryFn: getActiveAdmissions,
  });
}
