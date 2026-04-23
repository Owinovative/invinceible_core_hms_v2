export interface QueuePatient {
  id: number;
  patientNumber?: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
}

export interface QueueDoctor {
  id: number;
  firstName?: string;
  lastName?: string;
  staffCode?: string;
}

export interface QueueClinic {
  id: number;
  name?: string;
  code?: string;
}

export interface QueueItem {
  id: number;
  appointmentNumber?: string;
  appointmentDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  visitReason?: string | null;
  statusCode?: string | null;
  triagePriority?: string | null;
  queueNumber?: string | null;
  patient?: QueuePatient | null;
  doctor?: QueueDoctor | null;
  clinic?: QueueClinic | null;
}

export interface QueueStats {
  total?: number;
  waiting?: number;
  inProgress?: number;
  completed?: number;
}
