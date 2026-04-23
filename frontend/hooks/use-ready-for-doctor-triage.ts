"use client";

import { useQuery } from "@tanstack/react-query";
import { getReadyForDoctorTriage } from "@/services/triage-service";

export function useReadyForDoctorTriage() {
  return useQuery({
    queryKey: ["triage", "ready-for-doctor"],
    queryFn: getReadyForDoctorTriage,
  });
}
