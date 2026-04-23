"use client";


import { useQuery } from "@tanstack/react-query";
import { getPrescriptionsByPatientId } from "@/services/prescription-service";


export function usePatientPrescriptions(patientId?: number) {
  return useQuery({
    queryKey: ["prescriptions", "patient", patientId],
    queryFn: () => getPrescriptionsByPatientId(Number(patientId)),
    enabled: !!patientId,
  });
}
