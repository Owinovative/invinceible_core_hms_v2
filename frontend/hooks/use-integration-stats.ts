// Re-exports from the canonical SHA eligibility hook so existing imports keep working.
export { useIntegrationStats, useDhaStatus } from "@/hooks/use-sha-eligibility";
export type { DhaQueueStat as QueueStat } from "@/services/dha-service";
