"use client";

import { useQuery } from "@tanstack/react-query";
import { queryStaleTime } from "@/lib/query-stale-times";
import { getBranches } from "@/services/branch-service";

export function useBranches() {
  return useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
    staleTime: queryStaleTime.branches,
  });
}
