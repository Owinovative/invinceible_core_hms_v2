"use client";

import { useQuery } from "@tanstack/react-query";
import { getIpdClinicalDashboard } from "@/services/ipd-clinical-service";

export function useIpdClinicalDashboard(admissionId?: number) {
  return useQuery({
    queryKey: ["ipd-clinical-dashboard", admissionId],
    queryFn: () => getIpdClinicalDashboard(Number(admissionId)),
    enabled: Boolean(admissionId),
  });
}
