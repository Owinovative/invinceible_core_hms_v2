"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAppointmentById,
  getAppointments,
} from "@/services/appointment-service";

export function useAppointments() {
  return useQuery({
    queryKey: ["appointments"],
    queryFn: getAppointments,
  });
}

export function useAppointment(id?: number) {
  return useQuery({
    queryKey: ["appointment", id],
    queryFn: () => getAppointmentById(id as number),
    enabled: !!id,
  });
}
