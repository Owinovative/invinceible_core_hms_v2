import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface QueueStat {
  integration: string;
  status: string;
  count: number;
}

export function useIntegrationStats() {
  return useQuery({
    queryKey: ['integration-stats'],
    queryFn: async () => {
      const response = await api.get<QueueStat[]>('/integrations/queue/stats');
      return response.data;
    },
    refetchInterval: 10000,
  });
}

export function useDhaStatus() {
  return useQuery({
    queryKey: ['dha-status'],
    queryFn: async () => {
      const response = await api.get('/integrations/dha/status');
      return response.data;
    },
    refetchInterval: 30000,
  });
}
