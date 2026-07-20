import { apiFetch } from "@/lib/api";
import type { QueueItem, QueueStats } from "@/types/queue";

export async function getTodayQueue() {
  return apiFetch<QueueItem[]>("/queue/today", {
    method: "GET",
  });
}

function branchQuery(branchId?: number) {
  return branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
}

export async function getActiveQueue(branchId?: number) {
  return apiFetch<QueueItem[]>(`/queue${branchQuery(branchId)}`, {
    method: "GET",
  });
}

export async function getWaitingQueue() {
  return apiFetch<QueueItem[]>("/queue/waiting", {
    method: "GET",
  });
}

export async function getQueueStats(branchId?: number) {
  return apiFetch<QueueStats>(`/queue/stats${branchQuery(branchId)}`, {
    method: "GET",
  });
}
