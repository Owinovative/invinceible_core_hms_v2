"use client";

import { useQuery } from "@tanstack/react-query";
import { getPatientPortalLabResults } from "@/services/patient-portal-service";

export function usePatientPortalLabResults() {
  return useQuery({
    queryKey: ["patient-portal", "lab-results"],
    queryFn: getPatientPortalLabResults,
  });
}
