"use client";

import { useQuery } from "@tanstack/react-query";
import { getIpdVitalRecordsByAdmission } from "@/services/ipd-clinical-service";

export function useIpdVitalRecords(admissionId?: number) {
  return useQuery({
    queryKey: ["ipd-vital-records", admissionId],
    queryFn: () => getIpdVitalRecordsByAdmission(Number(admissionId)),
    enabled: Boolean(admissionId),
  });
}
