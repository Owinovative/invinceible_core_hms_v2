"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Power,
  Search,
  UserCog,
} from "lucide-react";
import { useStaff } from "@/hooks/use-staff";
import { useUpdateStaffStatus } from "@/hooks/use-update-staff-status";
import type { StaffItem } from "@/services/staff-service";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function fullName(item: StaffItem) {
  return [item.firstName, item.lastName].filter(Boolean).join(" ");
}

export function StaffTable() {
  const { data, isLoading } = useStaff();
  const updateStaffStatusMutation = useUpdateStaffStatus();

  const items = React.useMemo<StaffItem[]>(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const pageSize = 8;

  const filteredItems = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((staff) => {
      const haystack = [
        staff.staffCode,
        staff.firstName,
        staff.lastName,
        staff.email,
        staff.phone,
        staff.designation,
        staff.role?.name,
        staff.facility?.name,
        staff.branch?.name,
        staff.user?.username,
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
          <h2 className="text-xl font-bold tracking-tight">Staff</h2>
          <p className="text-sm text-muted-foreground">
            Staff directory across all facilities
          </p>
        </div>

        <div className="relative w-full md:w-[340px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff..."
            className="h-11 rounded-2xl pl-10"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.6rem] border gradient-border panel-shadow">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px]">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Staff
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Code
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Role
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Facility / Branch
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Linked User
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
                            <Skeleton className="h-4 w-32 rounded-lg" />
                            <Skeleton className="h-3 w-24 rounded-lg" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-24 rounded-lg" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-24 rounded-lg" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-32 rounded-lg" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-24 rounded-lg" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-9 w-28 rounded-xl" /></td>
                    </tr>
                  ))
                : pagedItems.map((staff) => (
                    <tr
                      key={staff.id}
                      className="border-t transition-colors hover:bg-muted/20"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10">
                            <UserCog className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                          </div>
                          <div>
                            <p className="font-semibold">{fullName(staff)}</p>
                            <p className="text-sm text-muted-foreground">
                              {staff.email || staff.phone || "No contact"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                          {staff.staffCode}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {staff.role?.name || staff.designation || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm">
                        <div>
                          <p>{staff.facility?.name || "—"}</p>
                          <p className="text-muted-foreground">
                            {staff.branch?.name || "No branch"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {staff.user?.username || "Not linked"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {staff.isClinician ? (
                            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                              Clinician
                            </span>
                          ) : null}
                          {staff.isPrescriber ? (
                            <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-600 dark:text-violet-400">
                              Prescriber
                            </span>
                          ) : null}
                          {staff.canLogin ? (
                            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                              Login Enabled
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-semibold",
                            staff.isActive === false
                              ? "status-critical"
                              : "status-success",
                          )}
                        >
                          {staff.isActive === false ? "Inactive" : "Active"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <Button
                          size="sm"
                          variant={staff.isActive === false ? "default" : "outline"}
                          className="rounded-xl"
                          disabled={updateStaffStatusMutation.isPending}
                          onClick={() =>
                            updateStaffStatusMutation.mutate({
                              id: staff.id,
                              isActive: staff.isActive === false,
                            })
                          }
                        >
                          <Power className="mr-2 h-4 w-4" />
                          {staff.isActive === false ? "Reactivate" : "Deactivate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-lg font-semibold">No staff found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create staff records to continue platform setup.
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
            staff members
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
