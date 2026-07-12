import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { terminologyService } from "@/services/terminology.service";

export function useTerminologyMetrics() {
  return useQuery({
    queryKey: ["terminology", "metrics"],
    queryFn: async () => {
      return terminologyService.getMetrics();
    },
    refetchInterval: 30000,
  });
}

export function useTerminologyHealth() {
  return useQuery({
    queryKey: ["terminology", "health"],
    queryFn: async () => {
      return terminologyService.checkHealth();
    },
    refetchInterval: 30000,
  });
}

export function useTerminologyCollections() {
  return useQuery({
    queryKey: ["terminology", "collections"],
    queryFn: async () => {
      return terminologyService.getCollections();
    },
  });
}

export function useTriggerTerminologySync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return terminologyService.triggerSync();
    },
    onSuccess: () => {
      // Invalidate to see the "IN_PROGRESS" status
      queryClient.invalidateQueries({ queryKey: ["terminology", "metrics"] });
      queryClient.invalidateQueries({ queryKey: ["terminology", "health"] });
    },
  });
}
