import { apiFetch } from "@/lib/api";

export interface FacilitySubscriptionStatus {
  facilityId: number;
  monthlyFee: number;
  startedAt?: string;
  paidThrough?: string;
  statusCode: string;
  warningLevel: "CLEAR" | "YELLOW" | "RED" | "LOCKED";
  locked: boolean;
  loginBlocked?: boolean;
  loginBlockedAt?: string | null;
  complianceWriteLocked?: boolean;
  complianceGraceEndsAt?: string | null;
  lockReason?: string | null;
  canDismiss: boolean;
  daysRemaining: number;
  secondsRemaining: number;
}

export interface FacilitySubscriptionPayment {
  id: number;
  paymentNumber: string;
  facilityId: number;
  amount: number;
  monthlyFee: number;
  monthsCovered: number;
  paidFrom?: string | null;
  paidThrough?: string | null;
  paymentMethod?: string | null;
  reference?: string | null;
  notes?: string | null;
  paidAt?: string;
}

export interface PlatformFacilitySubscription {
  id: number;
  code?: string;
  name: string;
  county?: string | null;
  town?: string | null;
  isActive?: boolean;
  subscriptionPayments?: FacilitySubscriptionPayment[];
  subscription: FacilitySubscriptionStatus;
}

export interface RecordFacilitySubscriptionPaymentPayload {
  facilityId: number;
  amount: number;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  paidAt?: string;
}

export function getMyFacilitySubscriptionStatus() {
  return apiFetch<FacilitySubscriptionStatus | null>(
    "/facility-subscriptions/my-status",
    { method: "GET" },
  );
}

export function getPlatformFacilitySubscriptions() {
  return apiFetch<PlatformFacilitySubscription[]>(
    "/facility-subscriptions/platform",
    { method: "GET" },
  );
}

export function recordFacilitySubscriptionPayment(
  payload: RecordFacilitySubscriptionPaymentPayload,
) {
  return apiFetch<{
    payment: FacilitySubscriptionPayment;
    subscription: FacilitySubscriptionStatus;
  }>("/facility-subscriptions/payments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
