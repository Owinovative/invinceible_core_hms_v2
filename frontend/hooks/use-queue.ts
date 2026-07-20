"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getActiveQueue,
  getQueueStats,
  getTodayQueue,
  getWaitingQueue,
} from "@/services/queue-service";

export function useActiveQueue(branchId?: number) {
  return useQuery({
    queryKey: ["queue", "active", branchId ?? "all"],
    queryFn: () => getActiveQueue(branchId),
    refetchInterval: 10_000,
  });
}

export function useTodayQueue() {
  return useQuery({
    queryKey: ["queue", "today"],
    queryFn: getTodayQueue,
    refetchInterval: 10_000,
  });
}

export function useWaitingQueue() {
  return useQuery({
    queryKey: ["queue", "waiting"],
    queryFn: getWaitingQueue,
    refetchInterval: 10_000,
  });
}

export function useQueueStats(branchId?: number) {
  return useQuery({
    queryKey: ["queue", "stats", branchId ?? "all"],
    queryFn: () => getQueueStats(branchId),
    refetchInterval: 10_000,
  });
}
