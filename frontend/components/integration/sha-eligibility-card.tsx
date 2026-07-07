"use client";

import * as React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  User,
  CreditCard,
  Building2,
  Calendar,
  Phone,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { EligibilityResult } from "@/services/dha-service";

interface ShaEligibilityCardProps {
  eligibility: EligibilityResult | null;
  isLoading?: boolean;
  error?: Error | null;
  className?: string;
}

export function ShaEligibilityCard({
  eligibility,
  isLoading,
  error,
  className = "",
}: ShaEligibilityCardProps) {
  if (error) {
    return (
      <Card className={`rounded-[1.8rem] border-destructive/20 bg-destructive/5 ${className}`}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-destructive">Verification Failed</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error.message || "Could not connect to the DHA Hub. Please try again."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={`rounded-[1.8rem] border-border/50 bg-card/50 shadow-sm ${className}`}>
        <CardHeader className="pb-3 border-b border-border/10">
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!eligibility) {
    return null; // Render nothing if no data and not loading
  }

  const isEligible = eligibility.status === "ELIGIBLE";
  const statusColor = isEligible ? "text-emerald-500" : "text-destructive";
  const statusBg = isEligible ? "bg-emerald-500/10" : "bg-destructive/10";
  const StatusIcon = isEligible ? ShieldCheck : ShieldAlert;

  return (
    <Card className={`rounded-[1.8rem] overflow-hidden border-border/50 shadow-sm ${className}`}>
      {/* Header Bar */}
      <div className={`px-6 py-4 flex items-center justify-between ${statusBg}`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-background shadow-sm ${statusColor}`}>
            <StatusIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className={`font-semibold ${statusColor}`}>
              {isEligible ? "Eligible for SHA Coverage" : "Not Eligible for Coverage"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Last verified:{" "}
              {eligibility.responseTimestamp
                ? new Intl.DateTimeFormat("en-KE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(eligibility.responseTimestamp))
                : "Just now"}
            </p>
          </div>
        </div>
        <Badge variant={isEligible ? "default" : "destructive"} className={isEligible ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
          {eligibility.membershipStatus || eligibility.status}
        </Badge>
      </div>

      <CardContent className="p-0">
        <div className="p-6 space-y-6">
          {/* Member Identity Section */}
          <div className="flex items-start gap-4 pb-6 border-b border-border/40">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
              <User className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-semibold tracking-tight">
                {eligibility.memberName || "Unknown Member"}
              </h4>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {eligibility.memberNumber && (
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    SHA: <span className="font-medium text-foreground">{eligibility.memberNumber}</span>
                  </span>
                )}
                {eligibility.nationalId && (
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    ID: <span className="font-medium text-foreground">{eligibility.nationalId}</span>
                  </span>
                )}
                {eligibility.dateOfBirth && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    DOB: <span className="font-medium text-foreground">{eligibility.dateOfBirth}</span>
                  </span>
                )}
                {eligibility.phoneNumber && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {eligibility.phoneNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Coverage Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scheme Information */}
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Scheme Details
              </h5>
              <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Scheme</p>
                  <p className="text-sm font-medium">{eligibility.scheme || "Primary Cover"}</p>
                </div>
                {eligibility.sponsor && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Sponsor</p>
                    <p className="text-sm font-medium">{eligibility.sponsor}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Coverage Start</p>
                    <p className="text-sm font-medium">
                      {eligibility.coverageStart
                          ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(
                              new Date(eligibility.coverageStart),
                            )
                          : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Coverage End</p>
                    <p className="text-sm font-medium">
                      {eligibility.coverageEnd
                          ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(
                              new Date(eligibility.coverageEnd),
                            )
                          : "Ongoing"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Facility & Restrictions */}
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Facility & Access
              </h5>
              <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3 h-full">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Assigned Facility</p>
                  <p className="text-sm font-medium">{eligibility.facilityAssignment || "Any Accredited Facility"}</p>
                </div>
                
                {eligibility.restrictions && eligibility.restrictions.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Restrictions</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {eligibility.restrictions.map((restriction, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 text-xs">
                          {restriction}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {eligibility.errorMessage && !isEligible && (
                  <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/5 p-2.5 rounded-lg mt-2">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>{eligibility.errorMessage}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Benefits List (if any) */}
          {eligibility.benefits && eligibility.benefits.length > 0 && (
            <div className="space-y-3 pt-2">
              <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Available Benefits
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {eligibility.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex flex-col justify-between rounded-xl border border-border/50 p-3 bg-card">
                    <p className="text-sm font-medium">{benefit.category}</p>
                    {benefit.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{benefit.description}</p>}
                    {(benefit.balance !== undefined || benefit.limit !== undefined) && (
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Balance:</span>
                        <span className="font-semibold">
                          {benefit.currency} {benefit.balance?.toLocaleString() ?? benefit.limit?.toLocaleString() ?? "∞"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dependants List (if any) */}
          {eligibility.dependants && eligibility.dependants.length > 0 && (
            <div className="space-y-3 pt-2">
              <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Dependants
              </h5>
              <div className="rounded-xl border border-border/50 divide-y divide-border/50 overflow-hidden bg-card">
                {eligibility.dependants.map((dep, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{dep.name}</p>
                        <p className="text-xs text-muted-foreground">{dep.relationship} {dep.memberNumber ? `· SHA: ${dep.memberNumber}` : ""}</p>
                      </div>
                    </div>
                    {dep.status && (
                      <Badge variant="outline" className={dep.status === 'ACTIVE' ? 'text-emerald-500 border-emerald-500/30' : ''}>
                        {dep.status}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
