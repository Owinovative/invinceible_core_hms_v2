import { apiFetch } from "@/lib/api";
import type { QueueItem, QueueStats } from "@/types/queue";

export async function getTodayQueue() {
  return apiFetch<QueueItem[]>("/queue/today", {
    method: "GET",
  });
}

export async function getWaitingQueue() {
  return apiFetch<QueueItem[]>("/queue/waiting", {
    method: "GET",
  });
}

export async function getQueueStats() {
  return apiFetch<QueueStats>("/queue/stats", {
    method: "GET",
  });
}
