"use client";

import { useQuery } from "@tanstack/react-query";
import { getOperationalModuleRecords } from "@/services/operational-module-service";

export function useOperationalModuleRecords(moduleSlug: string) {
  return useQuery({
    queryKey: ["operational-module-records", moduleSlug],
    queryFn: () => getOperationalModuleRecords(moduleSlug),
    enabled: !!moduleSlug,
  });
}
