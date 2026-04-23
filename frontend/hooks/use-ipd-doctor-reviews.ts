"use client";

import { useQuery } from "@tanstack/react-query";
import { getIpdDoctorReviewsByAdmission } from "@/services/ipd-clinical-service";

export function useIpdDoctorReviews(admissionId?: number) {
  return useQuery({
    queryKey: ["ipd-doctor-reviews", admissionId],
    queryFn: () => getIpdDoctorReviewsByAdmission(Number(admissionId)),
    enabled: Boolean(admissionId),
  });
}
