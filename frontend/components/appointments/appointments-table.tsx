"use client";

import * as React from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  Stethoscope,
  UserRound,
} from "lucide-react";
import type { Appointment } from "@/types/appointment";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function getPatientName(appointment: Appointment) {
  const patient = appointment.patient;
  if (!patient) return "Unknown patient";

  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");
}

function getDoctorName(appointment: Appointment) {
  const doctor = appointment.doctor;
  if (!doctor) return "—";

  return [doctor.firstName, doctor.lastName].filter(Boolean).join(" ");
}

function formatAppointmentDate(date?: string | null) {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function getStatusClass(status?: string | null) {
  const value = (status || "").toUpperCase();

  if (
    ["SCHEDULED", "BOOKED", "PENDING", "CHECKED_IN", "IN_PROGRESS"].includes(
      value,
    )
  ) {
    return "bg-info-soft text-info";
  }

  if (["COMPLETED", "DONE"].includes(value)) {
    return "bg-success-soft text-success";
  }

  if (["CANCELLED", "MISSED", "NO_SHOW"].includes(value)) {
    return "bg-destructive-soft text-destructive";
  }

  return "bg-warning-soft text-warning";
}

function getPriorityClass(priority?: string | null) {
  const value = (priority || "").toUpperCase();

  if (["URGENT", "HIGH"].includes(value)) {
    return "bg-destructive-soft text-destructive";
  }

  if (["MEDIUM"].includes(value)) {
    return "bg-warning-soft text-warning";
  }

  if (["LOW", "NORMAL"].includes(value)) {
    return "bg-success-soft text-success";
  }

  return "bg-info-soft text-info";
}

export function AppointmentsTable({
  items,
  isLoading,
}: {
  items: Appointment[];
  isLoading?: boolean;
}) {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const pageSize = 8;

  const filteredItems = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((appointment) => {
      const haystack = [
        appointment.appointmentNumber,
        appointment.visitReason,
        appointment.statusCode,
        appointment.triagePriority,
        appointment.clinic?.name,
        appointment.patient?.patientNumber,
        appointment.patient?.firstName,
        appointment.patient?.middleName,
        appointment.patient?.lastName,
        appointment.doctor?.firstName,
        appointment.doctor?.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [items, search]);

  React.useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pagedItems = React.useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safePage]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Appointments</h2>
          <p className="text-sm text-muted-foreground">
            Clinical appointments in your current scope
          </p>
        </div>

        <div className="relative w-full md:w-[360px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search appointment, patient, doctor..."
            className="h-11 rounded-2xl pl-10"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.6rem] border surface-spotlight shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Appointment
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Patient
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Doctor
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Clinic
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Date / Time
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Priority
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-28 rounded-lg" />
                          <Skeleton className="h-3 w-20 rounded-lg" />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-11 w-11 rounded-2xl" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32 rounded-lg" />
                            <Skeleton className="h-3 w-24 rounded-lg" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-28 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-24 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-28 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                    </tr>
                  ))
                : pagedItems.map((appointment) => (
                    <tr
                      key={appointment.id}
                      className="border-t transition-colors hover:bg-muted/20"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold">
                            {appointment.appointmentNumber}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {appointment.visitReason || "No visit reason"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                            <UserRound className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">
                              {getPatientName(appointment)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {appointment.patient?.patientNumber || "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Stethoscope className="h-4 w-4 text-muted-foreground" />
                          <span>{getDoctorName(appointment)}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {appointment.clinic?.name || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CalendarDays className="h-4 w-4" />
                            <span>
                              {formatAppointmentDate(appointment.appointmentDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock3 className="h-4 w-4" />
                            <span>
                              {appointment.startTime || "—"}
                              {appointment.endTime
                                ? ` - ${appointment.endTime}`
                                : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-semibold",
                            getStatusClass(appointment.statusCode),
                          )}
                        >
                          {appointment.statusCode || "Unknown"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-semibold",
                            getPriorityClass(appointment.triagePriority),
                          )}
                        >
                          {appointment.triagePriority || "Normal"}
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-lg font-semibold">No appointments found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try another search or create a new appointment.
            </p>
          </div>
        ) : null}
      </div>

      {!isLoading && filteredItems.length > 0 ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {pagedItems.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">
              {filteredItems.length}
            </span>{" "}
            appointments
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={safePage <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            <div className="rounded-xl border px-4 py-2 text-sm font-medium">
              {safePage} / {totalPages}
            </div>

            <Button
              variant="outline"
              className="rounded-xl"
              disabled={safePage >= totalPages}
              onClick={() =>
                setPage((prev) => Math.min(totalPages, prev + 1))
              }
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
