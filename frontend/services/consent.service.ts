import { apiFetch } from "@/lib/api";

export interface PatientContact {
  contact_id: number;
  contact_value: string;
}

export interface ConsentStatus {
  hasActiveConsent: boolean;
  consent?: {
    id: number;
    patientId: number;
    consultationId?: number | null;
    status: string;
    expiresAt?: string;
    createdAt: string;
  };
}

export interface VerifyOtpPayload {
  patientId: string;
  otpCode: string;
  interventionCodes: string[];
  serviceType: "INPATIENT" | "OUTPATIENT";
  consultationId?: number;
}

export const ConsentService = {
  async getContacts(patientId: string): Promise<PatientContact[]> {
    return apiFetch<PatientContact[]>(`/consent/contacts/${patientId}`);
  },

  async sendVisitOtp(
    patientId: string,
    contactId: number,
    interventionCodes: string[],
  ) {
    return apiFetch<unknown>("/consent/otp/request", {
      method: "POST",
      body: JSON.stringify({
        patientId,
        contactId,
        interventionCodes,
      }),
    });
  },

  async verifyVisitOtp(payload: VerifyOtpPayload) {
    return apiFetch<unknown>("/consent/otp/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getActiveConsent(patientId: string): Promise<ConsentStatus> {
    return apiFetch<ConsentStatus>(`/consent/status/${patientId}`);
  },
};
