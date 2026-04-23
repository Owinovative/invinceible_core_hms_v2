"use client";


import { useQuery } from "@tanstack/react-query";
import { getLabTests } from "@/services/lab-service";


export function useLabTests() {
  return useQuery({
    queryKey: ["lab-tests"],
    queryFn: getLabTests,
  });
}
