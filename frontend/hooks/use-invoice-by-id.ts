"use client";

import { useQuery } from "@tanstack/react-query";
import { getInvoiceById } from "@/services/billing-service";

export function useInvoiceById(id?: number | null) {
  return useQuery({
    queryKey: ["billing-invoice", id],
    queryFn: () => getInvoiceById(Number(id)),
    enabled: !!id,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });
}
