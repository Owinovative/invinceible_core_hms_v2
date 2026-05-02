"use client";

import { useQuery } from "@tanstack/react-query";
import { getShaClaims } from "@/services/sha-claim-service";

export function useShaClaims() {
  return useQuery({
    queryKey: ["sha-claims"],
    queryFn: getShaClaims,
  });
}
