"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateConsultation,
  type UpdateConsultationPayload,
} from "@/services/consultation-service";


export function useUpdateConsultation() {
  const queryClient = useQueryClient();


  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateConsultationPayload }) =>
      updateConsultation(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["consultation", data.id] });
      queryClient.invalidateQueries({
        queryKey: ["consultation-workspace", data.id],
      });
      queryClient.invalidateQueries({ queryKey: ["consultations"] });
    },
  });
}
