"use client";


import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createLabOrder,
  type CreateLabOrderPayload,
} from "@/services/lab-service";


export function useCreateLabOrder() {
  const queryClient = useQueryClient();


  return useMutation({
    mutationFn: (payload: CreateLabOrderPayload) => createLabOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-orders"] });
      queryClient.invalidateQueries({ queryKey: ["consultation-workspace"] });
    },
  });
}
