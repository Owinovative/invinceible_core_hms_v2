"use client";


import { useQuery } from "@tanstack/react-query";
import { getLabResultsByOrder } from "@/services/lab-service";


export function useLabResults(orderId?: number) {
  return useQuery({
    queryKey: ["lab-results", orderId],
    queryFn: () => getLabResultsByOrder(Number(orderId)),
    enabled: !!orderId,
  });
}
