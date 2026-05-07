"use client";

import { useQuery } from "@tanstack/react-query";
import { queryStaleTime } from "@/lib/query-stale-times";
import {
  getServiceTariffs,
  type ServiceTariffListParams,
} from "@/services/billing-service";

export function useServiceTariffs(params?: ServiceTariffListParams) {
  return useQuery({
    queryKey: ["service-tariffs", params],
    queryFn: () => getServiceTariffs(params),
    staleTime: queryStaleTime.tariffs,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
  });
}
