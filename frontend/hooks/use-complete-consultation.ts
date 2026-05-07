"use client";


import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeConsultation } from "@/services/consultation-service";


export function useCompleteConsultation() {
  const queryClient = useQueryClient();


  return useMutation({
    mutationFn: (id: number) => completeConsultation(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["consultation", data.id] });
      queryClient.invalidateQueries({
        queryKey: ["consultation-workspace", data.id],
      });
      queryClient.invalidateQueries({ queryKey: ["consultations"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["triage"] });
    },
  });
}
