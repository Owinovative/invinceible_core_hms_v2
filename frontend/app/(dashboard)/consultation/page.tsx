"use client";

import Link from "next/link";
import { FileText, Loader2, Stethoscope } from "lucide-react";

import { useConsultations } from "@/hooks/use-consultations";
import { useScope } from "@/providers/scope-provider";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function patientName(
  patient?: {
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
  } | null,
) {
  if (!patient) return "Unknown patient";
  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function statusTone(status?: string | null) {
  switch ((status ?? "").toUpperCase()) {
    case "COMPLETED":
      return "border-emerald-500/20 bg-success/10 text-emerald-300";
    case "IN_PROGRESS":
      return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
    default:
      return "border-white/10 bg-card/[0.04] text-muted-foreground";
  }
}

export default function ConsultationListPage() {
  const { facilityName, selectedBranchName } = useScope();
  const { data, isLoading } = useConsultations();
  const consultations = Array.isArray(data) ? data : [];
  const active = consultations.filter(
    (item) => item.statusCode === "IN_PROGRESS",
  );
  const completed = consultations.filter(
    (item) => item.statusCode === "COMPLETED",
  );

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border surface-spotlight shadow-md p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-600/10 via-cyan-500/5 to-transparent" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full border-0 bg-cyan-600/10 px-3 py-1 text-module">
              Doctor Workbench
            </Badge>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
                <Stethoscope className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Consultations
                </h1>
                <p className="text-muted-foreground">
                  Active and completed doctor notes with direct report access.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
            <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Facility
              </p>
              <p className="mt-2 text-sm font-semibold">
                {facilityName || "No facility"}
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Branch
              </p>
              <p className="mt-2 text-sm font-semibold">
                {selectedBranchName || "No branch"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">All Consultations</p>
            <p className="mt-2 text-3xl font-bold">{consultations.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Started</p>
            <p className="mt-2 text-3xl font-bold">{active.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="mt-2 text-3xl font-bold">{completed.length}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
        <CardHeader>
          <CardTitle>Consultation Register</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading consultations...
            </div>
          ) : consultations.length === 0 ? (
            <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
              No consultations have been started yet.
            </div>
          ) : (
            consultations.map((consultation) => (
              <div
                key={consultation.id}
                className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold">
                      {consultation.consultationNumber}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {patientName(consultation.patient)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Started:{" "}
                      {formatDate(consultation.appointment?.appointmentDate)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={`rounded-full border px-3 py-1 ${statusTone(
                        consultation.statusCode,
                      )}`}
                    >
                      {consultation.statusCode || "OPEN"}
                    </Badge>
                    <Link href={`/consultation/${consultation.id}`}>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-2xl"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Open Notes
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
