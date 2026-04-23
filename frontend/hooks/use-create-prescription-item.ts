"use client";


import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPrescriptionItem,
  type CreatePrescriptionItemPayload,
} from "@/services/prescription-item-service";


export function useCreatePrescriptionItem() {
  const queryClient = useQueryClient();


  return useMutation({
    mutationFn: (payload: CreatePrescriptionItemPayload) =>
      createPrescriptionItem(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({
        queryKey: ["prescription-items", "prescription", created.prescriptionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["prescriptions"],
      });
    },
  });
}
