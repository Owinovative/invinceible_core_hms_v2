"use client";


import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dischargeAdmission } from "@/services/ipd-service";


export function useDischargeAdmission() {
  const queryClient = useQueryClient();


  return useMutation({
    mutationFn: (id: number) => dischargeAdmission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ipd-admissions"] });
      queryClient.invalidateQueries({ queryKey: ["ipd-active-admissions"] });
      queryClient.invalidateQueries({ queryKey: ["ipd-beds"] });
    },
  });
}
