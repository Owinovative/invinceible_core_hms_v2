"use client";


import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createIpdProgressNote } from "@/services/ipd-clinical-service";


export function useCreateIpdProgressNote() {
  const queryClient = useQueryClient();


  return useMutation({
    mutationFn: createIpdProgressNote,
    onSuccess: (created) => {
      queryClient.invalidateQueries({
        queryKey: ["ipd-clinical-dashboard", created.admissionId],
      });
    },
  });
}
