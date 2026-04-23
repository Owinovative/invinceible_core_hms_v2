"use client";

import { useQuery } from "@tanstack/react-query";
import { getInvoices } from "@/services/billing-service";

export function useInvoices() {
  return useQuery({
    queryKey: ["billing-invoices"],
    queryFn: getInvoices,
  });
}
