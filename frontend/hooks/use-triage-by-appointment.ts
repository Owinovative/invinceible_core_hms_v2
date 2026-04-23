"use client";


import { useQuery } from "@tanstack/react-query";
import { getTriageByAppointmentId } from "@/services/triage-service";


export function useTriageByAppointment(appointmentId?: number) {
  return useQuery({
    queryKey: ["triage", "appointment", appointmentId],
    queryFn: () => getTriageByAppointmentId(Number(appointmentId)),
    enabled: !!appointmentId,
  });
}
