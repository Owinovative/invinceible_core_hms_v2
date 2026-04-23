"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getQueueStats,
  getTodayQueue,
  getWaitingQueue,
} from "@/services/queue-service";

export function useTodayQueue() {
  return useQuery({
    queryKey: ["queue", "today"],
    queryFn: getTodayQueue,
  });
}

export function useWaitingQueue() {
  return useQuery({
    queryKey: ["queue", "waiting"],
    queryFn: getWaitingQueue,
  });
}

export function useQueueStats() {
  return useQuery({
    queryKey: ["queue", "stats"],
    queryFn: getQueueStats,
  });
}
