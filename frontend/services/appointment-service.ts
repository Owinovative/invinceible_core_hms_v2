



import { apiFetch } from "@/lib/api";
import type { Appointment } from "@/types/appointment";


export interface CreateAppointmentPayload {
  appointmentNumber?: string;
  appointmentDate: string;
  patientId: number;
  doctorId?: number;
  clinicId?: number;
  startTime?: string;
  endTime?: string;
  visitReason?: string;
  statusCode?: string;
  triagePriority?: string;
  notes?: string;
}


export async function getAppointments() {
  return apiFetch<Appointment[]>("/appointments", {
    method: "GET",
  });
}


export async function getAppointmentById(id: number) {
  return apiFetch<Appointment>(`/appointments/${id}`, {
    method: "GET",
  });
}


export async function createAppointment(payload: CreateAppointmentPayload) {
  return apiFetch<Appointment>("/appointments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
