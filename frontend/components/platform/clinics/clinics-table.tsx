"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Power,
  Search,
  Stethoscope,
} from "lucide-react";
import { useClinics } from "@/hooks/use-clinics";
import { useUpdateClinicStatus } from "@/hooks/use-update-clinic-status";
import type { ClinicItem } from "@/services/clinic-service";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function ClinicsTable() {
  const { data, isLoading } = useClinics();
  const updateClinicStatusMutation = useUpdateClinicStatus();

  const items = React.useMemo<ClinicItem[]>(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const pageSize = 8;

  const filteredItems = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((clinic) => {
      const haystack = [
        clinic.code,
        clinic.name,
        clinic.clinicType,
        clinic.roomLocation,
        clinic.phoneExtension,
        clinic.facility?.name,
        clinic.branch?.name,
        clinic.department?.name,
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
          <h2 className="text-xl font-bold tracking-tight">Clinics</h2>
          <p className="text-sm text-muted-foreground">
            Registered clinics across the platform
          </p>
        </div>

        <div className="relative w-full md:w-[340px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clinics..."
            className="h-11 rounded-2xl pl-10"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.6rem] border surface-spotlight shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px]">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Clinic
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Code
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Facility / Branch
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Department
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Service
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Flags
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-11 w-11 rounded-2xl" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-36 rounded-lg" />
                            <Skeleton className="h-3 w-24 rounded-lg" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-24 rounded-lg" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-32 rounded-lg" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-28 rounded-lg" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-24 rounded-lg" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-9 w-28 rounded-xl" /></td>
                    </tr>
                  ))
                : pagedItems.map((clinic) => (
                    <tr
                      key={clinic.id}
                      className="border-t transition-colors hover:bg-muted/20"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10">
                            <Stethoscope className="h-5 w-5 text-module" />
                          </div>
                          <div>
                            <p className="font-semibold">{clinic.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {clinic.clinicType || "No type"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                          {clinic.code}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        <div>
                          <p>{clinic.facility?.name || "—"}</p>
                          <p className="text-muted-foreground">
                            {clinic.branch?.name || "No branch"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {clinic.department?.name || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm">
                        <div>
                          <p>
                            {clinic.serviceStartTime || "--:--"} - {clinic.serviceEndTime || "--:--"}
                          </p>
                          <p className="text-muted-foreground">
                            {clinic.consultationMinutes ?? 15} min / {clinic.maxDailyCapacity ?? 20} daily
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {clinic.isWalkInAllowed ? (
                            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-module">
                              Walk-in
                            </span>
                          ) : null}
                          {clinic.isReferralRequired ? (
                            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-warning">
                              Referral
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-semibold",
                            clinic.isActive === false
                              ? "bg-destructive-soft text-destructive"
                              : "bg-success-soft text-success",
                          )}
                        >
                          {clinic.isActive === false ? "Inactive" : "Active"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <Button
                          size="sm"
                          variant={clinic.isActive === false ? "default" : "outline"}
                          className="rounded-xl"
                          disabled={updateClinicStatusMutation.isPending}
                          onClick={() =>
                            updateClinicStatusMutation.mutate({
                              id: clinic.id,
                              isActive: clinic.isActive === false,
                            })
                          }
                        >
                          <Power className="mr-2 h-4 w-4" />
                          {clinic.isActive === false ? "Reactivate" : "Deactivate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-lg font-semibold">No clinics found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a clinic to continue service setup.
            </p>
          </div>
        ) : null}
      </div>

      {!isLoading && filteredItems.length > 0 ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">{pagedItems.length}</span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">{filteredItems.length}</span>{" "}
            clinics
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
