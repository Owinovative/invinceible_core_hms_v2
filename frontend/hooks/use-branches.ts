"use client";

import { useQuery } from "@tanstack/react-query";
import { getBranches } from "@/services/branch-service";

export function useBranches() {
  return useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });
}
