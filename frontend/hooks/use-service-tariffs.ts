"use client";

import { useQuery } from "@tanstack/react-query";
import { getServiceTariffs } from "@/services/billing-service";

export function useServiceTariffs() {
  return useQuery({
    queryKey: ["service-tariffs"],
    queryFn: getServiceTariffs,
  });
}
