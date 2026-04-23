"use client";

import { useQuery } from "@tanstack/react-query";
import { getLabOrderById } from "@/services/lab-service";

export function useLabOrder(id?: number) {
  return useQuery({
    queryKey: ["lab-order", id],
    queryFn: () => getLabOrderById(Number(id)),
    enabled: Boolean(id),
  });
}
