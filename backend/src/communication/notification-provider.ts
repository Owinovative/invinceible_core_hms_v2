export type NotificationChannel = 'sms' | 'whatsapp' | 'email';

export type NotificationMessage = {
  channel: NotificationChannel;
  recipient: string;
  templateKey: string;
  variables?: Record<string, string | number | boolean | null>;
  facilityId?: number | null;
  branchId?: number | null;
  patientId?: number | null;
};

export interface NotificationProvider {
  channel: NotificationChannel;
  send(
    message: NotificationMessage,
  ): Promise<{ queued: boolean; providerRef?: string }>;
}
