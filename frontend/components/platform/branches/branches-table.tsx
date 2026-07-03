"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Power,
  Search,
} from "lucide-react";
import { useBranches } from "@/hooks/use-branches";
import { useFacilities } from "@/hooks/use-facilities";
import { useUpdateBranch } from "@/hooks/use-update-branch";
import { useUpdateBranchStatus } from "@/hooks/use-update-branch-status";
import type { Branch } from "@/services/branch-service";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EditRecordDialog } from "@/components/platform/shared/edit-record-dialog";

function optionalValue(value: string) {
  return value.trim() || undefined;
}

function optionalNumber(value: string) {
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
}

export function BranchesTable() {
  const { data, isLoading } = useBranches();
  const { data: facilitiesData } = useFacilities();
  const updateBranchMutation = useUpdateBranch();
  const updateBranchStatusMutation = useUpdateBranchStatus();

  const items = React.useMemo<Branch[]>(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const pageSize = 8;
  const facilities = Array.isArray(facilitiesData) ? facilitiesData : [];

  const filteredItems = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((branch) => {
      const haystack = [
        branch.code,
        branch.name,
        branch.facility?.name,
        branch.county,
        branch.town,
        branch.country,
        branch.phone,
        branch.email,
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
          <h2 className="text-xl font-bold tracking-tight">Branches</h2>
          <p className="text-sm text-muted-foreground">
            Registered branches across facilities
          </p>
        </div>

        <div className="relative w-full md:w-[340px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search branches..."
            className="h-11 rounded-2xl pl-10"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.6rem] border surface-spotlight shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px]">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Branch
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Code
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Facility
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Location
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Contact
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
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-24 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-32 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-28 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-28 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-9 w-28 rounded-xl" />
                      </td>
                    </tr>
                  ))
                : pagedItems.map((branch) => (
                    <tr
                      key={branch.id}
                      className="border-t transition-colors hover:bg-muted/20"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10">
                            <GitBranch className="h-5 w-5 text-module" />
                          </div>
                          <div>
                            <p className="font-semibold">{branch.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {branch.email || "No email"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                          {branch.code}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {branch.facility?.name || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {[branch.town, branch.county, branch.country]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {branch.phone || branch.email || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-semibold",
                              branch.isActive === false
                                ? "bg-destructive-soft text-destructive"
                                : "bg-success-soft text-success",
                            )}
                          >
                            {branch.isActive === false ? "Inactive" : "Active"}
                          </span>

                          {branch.isDefault ? (
                            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-module">
                              Default
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <EditRecordDialog
                            title={`Edit ${branch.name}`}
                            description="Update branch contact, location, payment defaults, and facility ownership."
                            isPending={updateBranchMutation.isPending}
                            fields={[
                              {
                                name: "facilityId",
                                label: "Facility",
                                type: "select",
                                options: facilities.map((facility) => ({
                                  label: facility.name,
                                  value: String(facility.id),
                                })),
                              },
                              { name: "name", label: "Branch Name" },
                              { name: "county", label: "County" },
                              { name: "town", label: "Town" },
                              { name: "country", label: "Country" },
                              { name: "phone", label: "Phone" },
                              {
                                name: "email",
                                label: "Email",
                                type: "email",
                              },
                              {
                                name: "address",
                                label: "Physical Address",
                                className: "md:col-span-2",
                              },
                              { name: "timezone", label: "Timezone" },
                              { name: "currency", label: "Currency" },
                              {
                                name: "mpesaShortcode",
                                label: "M-PESA Shortcode",
                              },
                              {
                                name: "mpesaPaybill",
                                label: "M-PESA Paybill",
                              },
                              {
                                name: "mpesaAccountNumber",
                                label: "M-PESA Account Number",
                              },
                              {
                                name: "mpesaTillNumber",
                                label: "M-PESA Till Number",
                              },
                              {
                                name: "mpesaPochiNumber",
                                label: "Pochi La Biashara",
                              },
                              { name: "latitude", label: "Latitude" },
                              { name: "longitude", label: "Longitude" },
                              {
                                name: "mapLocationLabel",
                                label: "Location Label",
                              },
                              {
                                name: "googleMapsUrl",
                                label: "Google Maps URL",
                                className: "md:col-span-2",
                              },
                            ]}
                            initialValues={{
                              facilityId: String(branch.facilityId),
                              name: branch.name ?? "",
                              county: branch.county ?? "",
                              town: branch.town ?? "",
                              country: branch.country ?? "",
                              phone: branch.phone ?? "",
                              email: branch.email ?? "",
                              address: branch.address ?? "",
                              timezone: branch.timezone ?? "",
                              currency: branch.currency ?? "",
                              mpesaShortcode: branch.mpesaShortcode ?? "",
                              mpesaPaybill: branch.mpesaPaybill ?? "",
                              mpesaAccountNumber:
                                branch.mpesaAccountNumber ?? "",
                              mpesaTillNumber: branch.mpesaTillNumber ?? "",
                              mpesaPochiNumber:
                                branch.mpesaPochiNumber ?? "",
                              latitude:
                                branch.latitude !== null &&
                                branch.latitude !== undefined
                                  ? String(branch.latitude)
                                  : "",
                              longitude:
                                branch.longitude !== null &&
                                branch.longitude !== undefined
                                  ? String(branch.longitude)
                                  : "",
                              mapLocationLabel:
                                branch.mapLocationLabel ?? "",
                              googleMapsUrl: branch.googleMapsUrl ?? "",
                            }}
                            onSubmit={(values) =>
                              updateBranchMutation.mutateAsync({
                                id: branch.id,
                                payload: {
                                  facilityId: Number(values.facilityId),
                                  name: values.name.trim(),
                                  county: optionalValue(values.county),
                                  town: optionalValue(values.town),
                                  country: optionalValue(values.country),
                                  phone: optionalValue(values.phone),
                                  email: optionalValue(values.email),
                                  address: optionalValue(values.address),
                                  timezone: optionalValue(values.timezone),
                                  currency: optionalValue(values.currency),
                                  mpesaShortcode: optionalValue(
                                    values.mpesaShortcode,
                                  ),
                                  mpesaPaybill: optionalValue(
                                    values.mpesaPaybill,
                                  ),
                                  mpesaAccountNumber: optionalValue(
                                    values.mpesaAccountNumber,
                                  ),
                                  mpesaTillNumber: optionalValue(
                                    values.mpesaTillNumber,
                                  ),
                                  mpesaPochiNumber: optionalValue(
                                    values.mpesaPochiNumber,
                                  ),
                                  latitude: optionalNumber(values.latitude),
                                  longitude: optionalNumber(values.longitude),
                                  mapLocationLabel: optionalValue(
                                    values.mapLocationLabel,
                                  ),
                                  googleMapsUrl: optionalValue(
                                    values.googleMapsUrl,
                                  ),
                                },
                              })
                            }
                          />

                          <Button
                            size="sm"
                            variant={
                              branch.isActive === false ? "default" : "outline"
                            }
                            className="rounded-xl"
                            disabled={updateBranchStatusMutation.isPending}
                            onClick={() =>
                              updateBranchStatusMutation.mutate({
                                id: branch.id,
                                isActive: branch.isActive === false,
                              })
                            }
                          >
                            <Power className="mr-2 h-4 w-4" />
                            {branch.isActive === false
                              ? "Reactivate"
                              : "Deactivate"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-lg font-semibold">No branches found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a branch to continue platform setup.
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
            branches
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
