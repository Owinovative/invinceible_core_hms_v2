import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface QueueStat {
  integration: string;
  status: string;
  count: number;
}

export function useIntegrationStats() {
  return useQuery({
    queryKey: ['integration-stats'],
    queryFn: async () => {
      return apiFetch<QueueStat[]>('/integrations/queue/stats');
    },
    refetchInterval: 10000,
  });
}

export function useDhaStatus() {
  return useQuery({
    queryKey: ['dha-status'],
    queryFn: async () => {
      return apiFetch<any>('/integrations/dha/status');
    },
    refetchInterval: 30000,
  });
}
