"use client";


import { useQuery } from "@tanstack/react-query";
import { getLabQueue } from "@/services/lab-service";


export function useLabQueue() {
  return useQuery({
    queryKey: ["lab-queue"],
    queryFn: getLabQueue,
  });
}
