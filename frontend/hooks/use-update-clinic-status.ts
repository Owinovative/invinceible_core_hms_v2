"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateClinic } from "@/services/clinic-service";

export function useUpdateClinicStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      updateClinic(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinics"] });
    },
  });
}
