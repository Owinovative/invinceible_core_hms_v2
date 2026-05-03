"use client";

import * as React from "react";
import { AlertTriangle, Clock3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { useMyFacilitySubscriptionStatus } from "@/hooks/use-facility-subscription";

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatCountdown(totalSeconds?: number) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds || 0)));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function FacilitySubscriptionBanner() {
  const { user } = useAuth();
  const roleCode = user?.roleCode ?? "";
  const isFacilityAdmin = ["ADMIN", "FACILITY_ADMIN"].includes(roleCode);
  const enabled = Boolean(user?.homeFacilityId && isFacilityAdmin);
  const { data: status } = useMyFacilitySubscriptionStatus(enabled);
  const [nowTick, setNowTick] = React.useState(0);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (!status || status.warningLevel !== "RED") return;
    const interval = window.setInterval(() => setNowTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [status]);

  React.useEffect(() => {
    if (!status) return;
    const key = `facility-subscription-dismissed:${status.facilityId}:${todayKey()}`;
    setDismissed(localStorage.getItem(key) === "1");
  }, [status]);

  if (!enabled || !status || status.warningLevel === "CLEAR") return null;
  if (status.warningLevel === "YELLOW" && dismissed) return null;

  const isRed = status.warningLevel === "RED" || status.warningLevel === "LOCKED";
  const secondsRemaining = Math.max(0, status.secondsRemaining - nowTick);

  return (
    <div
      className={`border-b px-4 py-3 text-sm ${
        isRed
          ? "border-red-300 bg-red-50 text-red-900"
          : "border-amber-300 bg-amber-50 text-amber-950"
      }`}
    >
      <div className="mx-auto flex max-w-[1700px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {isRed ? (
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          )}
          <div className="min-w-0">
            <p className="font-semibold">
              {isRed ? "Subscription payment is urgent" : "Subscription payment is approaching"}
            </p>
            <p className="leading-6">
              Facility monthly access is {formatMoney(status.monthlyFee)}.{" "}
              {isRed
                ? `Countdown: ${formatCountdown(secondsRemaining)}. Data entry locks when it reaches zero.`
                : `Payment is due in ${Math.ceil(status.daysRemaining)} days. This reminder can be closed for today.`}
            </p>
          </div>
        </div>

        {!isRed ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-md border-amber-400 bg-white text-amber-900 hover:bg-amber-100"
            onClick={() => {
              const key = `facility-subscription-dismissed:${status.facilityId}:${todayKey()}`;
              localStorage.setItem(key, "1");
              setDismissed(true);
            }}
          >
            <X className="mr-2 h-4 w-4" />
            Close for today
          </Button>
        ) : null}
      </div>
    </div>
  );
}
