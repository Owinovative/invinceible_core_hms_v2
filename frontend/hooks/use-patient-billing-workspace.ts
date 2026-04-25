"use client";

import { useQuery } from "@tanstack/react-query";
import { getPatientBillingWorkspace } from "@/services/billing-service";

export function usePatientBillingWorkspace(patientId?: number | null) {
  return useQuery({
    queryKey: ["patient-billing-workspace", patientId],
    queryFn: () => getPatientBillingWorkspace(Number(patientId)),
    enabled: !!patientId,
  });
}
