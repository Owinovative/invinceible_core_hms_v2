"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  postAdmissionBedCharge,
  type PostAdmissionBedChargePayload,
} from "@/services/billing-service";

export function usePostAdmissionBedCharge(admissionId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PostAdmissionBedChargePayload) =>
      postAdmissionBedCharge(Number(admissionId), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["billing-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["billing-revenue-integrity"] });
    },
  });
}
