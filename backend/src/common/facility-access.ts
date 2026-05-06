export const FACILITY_GRACE_DAYS = 15;

const DAY_MS = 24 * 60 * 60 * 1000;

export type FacilityAccessShape = {
  id: number;
  name?: string | null;
  createdAt: Date;
  updatedAt?: Date | null;
  isActive?: boolean | null;
  complianceStatus?: string | null;
  complianceReason?: string | null;
  complianceDeactivatedAt?: Date | null;
  complianceGraceEndsAt?: Date | null;
  subscriptionStartedAt?: Date | null;
  subscriptionPaidThrough?: Date | null;
  subscriptionStatus?: string | null;
  subscriptionLockedAt?: Date | null;
};

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

export function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function normalizeComplianceStatus(facility: FacilityAccessShape) {
  const raw = String(facility.complianceStatus || '').trim().toUpperCase();

  if (raw) return raw;
  return facility.isActive === false ? 'SUSPENDED' : 'COMPLIANT';
}

export function computeFacilityAccessStatus(
  facility: FacilityAccessShape,
  now = new Date(),
) {
  const subscriptionStartedAt =
    facility.subscriptionStartedAt ?? facility.createdAt;
  const subscriptionPaidThrough =
    facility.subscriptionPaidThrough ?? addMonths(subscriptionStartedAt, 1);
  const subscriptionOverdue =
    subscriptionPaidThrough.getTime() <= now.getTime() ||
    facility.subscriptionStatus === 'LOCKED';
  const subscriptionLoginBlockedAt = addDays(
    subscriptionPaidThrough,
    FACILITY_GRACE_DAYS,
  );
  const subscriptionLoginBlocked =
    subscriptionOverdue &&
    subscriptionLoginBlockedAt.getTime() <= now.getTime();

  const complianceStatus = normalizeComplianceStatus(facility);
  const complianceOk =
    facility.isActive !== false &&
    ['ACTIVE', 'COMPLIANT', 'GOOD_STANDING'].includes(complianceStatus);
  const complianceDeactivatedAt =
    facility.complianceDeactivatedAt ??
    (!complianceOk ? facility.updatedAt ?? facility.createdAt : null);
  const complianceGraceEndsAt =
    facility.complianceGraceEndsAt ??
    (complianceDeactivatedAt
      ? addDays(complianceDeactivatedAt, FACILITY_GRACE_DAYS)
      : null);
  const complianceLoginBlocked =
    !complianceOk &&
    !!complianceGraceEndsAt &&
    complianceGraceEndsAt.getTime() <= now.getTime();

  return {
    facilityId: facility.id,
    facilityName: facility.name ?? null,
    complianceStatus,
    complianceReason: facility.complianceReason ?? null,
    complianceOk,
    complianceDeactivatedAt,
    complianceGraceEndsAt,
    complianceWriteLocked: !complianceOk,
    complianceLoginBlocked,
    subscriptionPaidThrough,
    subscriptionOverdue,
    subscriptionLoginBlockedAt,
    subscriptionWriteLocked: subscriptionOverdue,
    subscriptionLoginBlocked,
    writeLocked: !complianceOk || subscriptionOverdue,
    loginBlocked: complianceLoginBlocked || subscriptionLoginBlocked,
    lockReason: complianceLoginBlocked
      ? 'FACILITY_COMPLIANCE_GRACE_EXPIRED'
      : subscriptionLoginBlocked
        ? 'FACILITY_SUBSCRIPTION_GRACE_EXPIRED'
        : !complianceOk
          ? 'FACILITY_COMPLIANCE_READ_ONLY'
          : subscriptionOverdue
            ? 'FACILITY_SUBSCRIPTION_OVERDUE'
            : null,
  };
}
