"use client";


import { useQuery } from "@tanstack/react-query";
import { getWards } from "@/services/ipd-service";


export function useWards() {
  return useQuery({
    queryKey: ["ipd-wards"],
    queryFn: getWards,
  });
}
