import { useQuery } from "@tanstack/react-query";
import { getDhaTransactions, type DhaTransaction } from "@/services/dha-service";

export function useDhaTransactions(params?: {
  patientId?: number;
  transactionType?: string;
  limit?: number;
}) {
  return useQuery<DhaTransaction[]>({
    queryKey: ["dha", "transactions", params],
    queryFn: () => getDhaTransactions(params),
    refetchInterval: 15_000,
  });
}
