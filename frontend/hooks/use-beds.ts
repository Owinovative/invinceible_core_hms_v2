"use client";


import { useQuery } from "@tanstack/react-query";
import { getBeds } from "@/services/ipd-service";


export function useBeds() {
  return useQuery({
    queryKey: ["ipd-beds"],
    queryFn: getBeds,
  });
}
