"use client";

import { useQuery } from "@tanstack/react-query";
import { getPatients, getPatientById } from "@/services/patient-service";

export function usePatients() {
  return useQuery({
    queryKey: ["patients"],
    queryFn: getPatients,
  });
}

export function usePatient(id?: number) {
  return useQuery({
    queryKey: ["patient", id],
    queryFn: () => getPatientById(id as number),
    enabled: !!id,
  });
}
