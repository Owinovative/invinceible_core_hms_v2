"use client";

import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/services/settings-service";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
}
