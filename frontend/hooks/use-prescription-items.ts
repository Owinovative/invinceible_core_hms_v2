"use client";


import { useQuery } from "@tanstack/react-query";
import { getPrescriptionItemsByPrescriptionId } from "@/services/prescription-item-service";


export function usePrescriptionItems(prescriptionId?: number) {
  return useQuery({
    queryKey: ["prescription-items", "prescription", prescriptionId],
    queryFn: () => getPrescriptionItemsByPrescriptionId(Number(prescriptionId)),
    enabled: !!prescriptionId,
  });
}
