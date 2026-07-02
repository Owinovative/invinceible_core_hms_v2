"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  Stethoscope,
  UserRound,
} from "lucide-react";
import type { QueueItem } from "@/types/queue";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function getPatientName(item: QueueItem) {
  const patient = item.patient;
  if (!patient) return "Unknown patient";

  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");
}

function getDoctorName(item: QueueItem) {
  const doctor = item.doctor;
  if (!doctor) return "—";
  return [doctor.firstName, doctor.lastName].filter(Boolean).join(" ");
}

function getStatusClass(status?: string | null) {
  const value = (status || "").toUpperCase();

  if (["WAITING", "SCHEDULED", "BOOKED", "PENDING", "CHECKED_IN"].includes(value)) {
    return "bg-info-soft text-info";
  }

  if (["IN_PROGRESS", "STARTED"].includes(value)) {
    return "bg-warning-soft text-warning";
  }

  if (["COMPLETED", "DONE"].includes(value)) {
    return "bg-success-soft text-success";
  }

  if (["CANCELLED", "MISSED", "NO_SHOW"].includes(value)) {
    return "bg-destructive-soft text-destructive";
  }

  return "bg-info-soft text-info";
}

function getPriorityClass(priority?: string | null) {
  const value = (priority || "").toUpperCase();

  if (["URGENT", "HIGH"].includes(value)) return "bg-destructive-soft text-destructive";
  if (["MEDIUM"].includes(value)) return "bg-warning-soft text-warning";
  if (["LOW", "NORMAL"].includes(value)) return "bg-success-soft text-success";
  return "bg-info-soft text-info";
}

export function QueueTable({
  items,
  isLoading,
}: {
  items: QueueItem[];
  isLoading?: boolean;
}) {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const pageSize = 8;

  const filteredItems = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => {
      const haystack = [
        item.queueNumber,
        item.appointmentNumber,
        item.visitReason,
        item.statusCode,
        item.triagePriority,
        item.clinic?.name,
        item.patient?.patientNumber,
        item.patient?.firstName,
        item.patient?.middleName,
        item.patient?.lastName,
        item.doctor?.firstName,
        item.doctor?.lastName,
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
          <h2 className="text-xl font-bold tracking-tight">Queue</h2>
          <p className="text-sm text-muted-foreground">
            Live patient queue in the active scope
          </p>
        </div>

        <div className="relative w-full md:w-[340px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search queue, patient, doctor..."
            className="h-11 rounded-2xl pl-10"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.6rem] border surface-spotlight shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px]">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Queue
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
                  Time
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
                        <Skeleton className="h-4 w-24 rounded-lg" />
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
                        <Skeleton className="h-4 w-24 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                    </tr>
                  ))
                : pagedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t transition-colors hover:bg-muted/20"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold">
                            {item.queueNumber || item.appointmentNumber || `#${item.id}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.visitReason || "General visit"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                            <UserRound className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{getPatientName(item)}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.patient?.patientNumber || "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Stethoscope className="h-4 w-4 text-muted-foreground" />
                          <span>{getDoctorName(item)}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {item.clinic?.name || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock3 className="h-4 w-4" />
                          <span>
                            {item.startTime || "—"}
                            {item.endTime ? ` - ${item.endTime}` : ""}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-semibold",
                            getStatusClass(item.statusCode),
                          )}
                        >
                          {item.statusCode || "Unknown"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-semibold",
                            getPriorityClass(item.triagePriority),
                          )}
                        >
                          {item.triagePriority || "Normal"}
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-lg font-semibold">No queue items found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The queue is currently clear in this scope.
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
            queue items
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
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
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
