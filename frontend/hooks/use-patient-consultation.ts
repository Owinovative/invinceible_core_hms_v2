"use client";


import { useQuery } from "@tanstack/react-query";
import { getConsultationsByPatientId } from "@/services/consultation-service";


export function usePatientConsultations(patientId?: number) {
  return useQuery({
    queryKey: ["consultations", "patient", patientId],
    queryFn: () => getConsultationsByPatientId(Number(patientId)),
    enabled: !!patientId,
  });
}
