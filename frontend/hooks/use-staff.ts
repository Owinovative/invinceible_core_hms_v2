"use client";

import { useQuery } from "@tanstack/react-query";
import { getStaff } from "@/services/staff-service";

export function useStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: getStaff,
  });
}
