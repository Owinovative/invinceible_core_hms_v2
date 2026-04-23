"use client";


import { useQuery } from "@tanstack/react-query";
import { getPrescriptionsByConsultationId } from "@/services/prescription-service";


export function useConsultationPrescriptions(consultationId?: number) {
  return useQuery({
    queryKey: ["prescriptions", "consultation", consultationId],
    queryFn: () => getPrescriptionsByConsultationId(Number(consultationId)),
    enabled: !!consultationId,
  });
}
