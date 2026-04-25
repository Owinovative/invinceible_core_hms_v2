"use client";

import { useQuery } from "@tanstack/react-query";
import { getCashierClose } from "@/services/billing-service";

export function useCashierClose(date?: string) {
  return useQuery({
    queryKey: ["billing-cashier-close", date],
    queryFn: () => getCashierClose(date),
  });
}
