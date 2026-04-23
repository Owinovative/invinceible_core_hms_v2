"use client";


import { useMutation, useQueryClient } from "@tanstack/react-query";
import { administerTreatment } from "@/services/ipd-clinical-service";


export function useAdministerTreatment(admissionId?: number) {
  const queryClient = useQueryClient();


  return useMutation({
    mutationFn: ({ entryId, administeredByStaffId }: {
      entryId: number;
      administeredByStaffId?: number;
    }) => administerTreatment(entryId, { administeredByStaffId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ipd-clinical-dashboard", admissionId],
      });
    },
  });
}
