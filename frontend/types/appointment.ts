export interface AppointmentPatient {
  id: number;
  patientNumber?: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
}

export interface AppointmentDoctor {
  id: number;
  firstName?: string;
  lastName?: string;
  staffCode?: string;
}

export interface AppointmentClinic {
  id: number;
  name?: string;
  code?: string;
}

export interface Appointment {
  id: number;
  appointmentNumber: string;
  appointmentDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  visitReason?: string | null;
  statusCode?: string | null;
  triagePriority?: string | null;
  notes?: string | null;
  facilityId?: number | null;
  branchId?: number | null;
  patientId?: number | null;
  doctorId?: number | null;
  clinicId?: number | null;
  patient?: AppointmentPatient | null;
  doctor?: AppointmentDoctor | null;
  clinic?: AppointmentClinic | null;
  createdAt?: string;
  updatedAt?: string;
}
