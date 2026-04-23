"use client";

import { useQuery } from "@tanstack/react-query";
import { getLabOrders } from "@/services/lab-service";

export function useLabOrders() {
  return useQuery({
    queryKey: ["lab-orders"],
    queryFn: getLabOrders,
  });
}
