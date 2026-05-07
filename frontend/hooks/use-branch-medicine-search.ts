"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { searchBranchPharmacyStock } from "@/services/pharmacy-stock-service";

export function useDebouncedValue<T>(value: T, delayMs = 250) {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return debounced;
}

export function useBranchMedicineSearch(
  branchId?: number | null,
  search?: string,
) {
  const debouncedSearch = useDebouncedValue(search ?? "", 250);

  return useQuery({
    queryKey: ["branch-medicine-search", branchId, debouncedSearch],
    queryFn: () =>
      searchBranchPharmacyStock(branchId as number, debouncedSearch),
    enabled: Boolean(branchId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
