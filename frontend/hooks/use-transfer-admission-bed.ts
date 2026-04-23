"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  transferAdmissionBed,
  type TransferAdmissionBedPayload,
} from "@/services/ipd-service";

export function useTransferAdmissionBed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: TransferAdmissionBedPayload;
    }) => transferAdmissionBed(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["active-admissions"] });
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      queryClient.invalidateQueries({ queryKey: ["admission", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
    },
  });
}
