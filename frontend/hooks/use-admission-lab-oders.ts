"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdmissionLabOrders } from "@/services/ipd-clinical-service";

export function useAdmissionLabOrders(admissionId?: number) {
  return useQuery({
    queryKey: ["admission-lab-orders", admissionId],
    queryFn: () => getAdmissionLabOrders(Number(admissionId)),
    enabled: Boolean(admissionId),
  });
}
