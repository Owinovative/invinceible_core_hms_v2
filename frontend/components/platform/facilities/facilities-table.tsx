"use client";

import * as React from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Power,
  Search,
} from "lucide-react";
import { useFacilities } from "@/hooks/use-facilities";
import { useUpdateFacility } from "@/hooks/use-update-facility";
import { useUpdateFacilityStatus } from "@/hooks/use-update-facility-status";
import type { Facility } from "@/services/facility-service";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EditRecordDialog } from "@/components/platform/shared/edit-record-dialog";

function optionalValue(value: string) {
  return value.trim() || undefined;
}

function optionalNumber(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : undefined;
}

export function FacilitiesTable() {
  const { data, isLoading } = useFacilities();
  const updateFacilityMutation = useUpdateFacility();
  const updateFacilityStatusMutation = useUpdateFacilityStatus();

  const items = React.useMemo<Facility[]>(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const pageSize = 8;

  const filteredItems = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((facility) => {
      const haystack = [
        facility.code,
        facility.branchCode,
        facility.name,
        facility.facilityType,
        facility.county,
        facility.town,
        facility.country,
        facility.phone,
        facility.email,
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
          <h2 className="text-xl font-bold tracking-tight">Facilities</h2>
          <p className="text-sm text-muted-foreground">
            Registered facilities across the platform
          </p>
        </div>

        <div className="relative w-full md:w-[340px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search facilities..."
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
                  Facility
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Code
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Type
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
                            <Skeleton className="h-4 w-40 rounded-lg" />
                            <Skeleton className="h-3 w-24 rounded-lg" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-24 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-20 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-28 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-32 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-9 w-28 rounded-xl" />
                      </td>
                    </tr>
                  ))
                : pagedItems.map((facility) => (
                    <tr
                      key={facility.id}
                      className="border-t transition-colors hover:bg-muted/20"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10">
                            {facility.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={facility.logoUrl}
                                alt=""
                                className="h-full w-full rounded-xl object-contain"
                              />
                            ) : (
                              <Building2 className="h-5 w-5 text-module" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">{facility.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {facility.email || "No email"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                            {facility.code}
                          </span>
                          {facility.branchCode ? (
                            <p className="text-xs text-muted-foreground">
                              Branch code: {facility.branchCode}
                            </p>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {facility.facilityType || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm">
                        <div className="space-y-1">
                          <p>
                            {[facility.town, facility.county, facility.country]
                              .filter(Boolean)
                              .join(", ") || "-"}
                          </p>
                          {facility.latitude && facility.longitude ? (
                            <a
                              href={
                                facility.googleMapsUrl ||
                                `https://www.google.com/maps?q=${facility.latitude},${facility.longitude}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-module underline underline-offset-4"
                            >
                              <MapPin className="h-3 w-3" />
                              {facility.mapLocationLabel || "Open map"}
                            </a>
                          ) : (
                            <span className="text-xs text-destructive">
                              Coordinates missing
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {facility.phone || facility.email || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-semibold",
                              facility.isActive === false
                                ? "bg-destructive-soft text-destructive"
                                : "bg-success-soft text-success",
                            )}
                          >
                            {facility.isActive === false
                              ? "Inactive"
                              : "Active"}
                          </span>

                          {facility.isDefault ? (
                            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-module">
                              Default
                            </span>
                          ) : null}

                          {facility.isHeadOffice ? (
                            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-module">
                              Head Office
                            </span>
                          ) : null}

                          {facility.accessStatus?.complianceWriteLocked ? (
                            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-warning">
                              Read-only grace
                            </span>
                          ) : null}

                          {facility.accessStatus?.loginBlocked ? (
                            <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-destructive">
                              Login blocked
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <EditRecordDialog
                            title={`Edit ${facility.name}`}
                            description="Update facility identity, location, contacts, and payment defaults."
                            isPending={updateFacilityMutation.isPending}
                            fields={[
                              { name: "name", label: "Facility Name" },
                              { name: "facilityType", label: "Facility Type" },
                              { name: "county", label: "County" },
                              { name: "town", label: "Town" },
                              { name: "country", label: "Country" },
                              { name: "phone", label: "Phone" },
                              {
                                name: "email",
                                label: "Email",
                                type: "email",
                              },
                              { name: "website", label: "Website" },
                              {
                                name: "logoUrl",
                                label: "Facility Logo",
                                type: "fileDataUrl",
                                className: "md:col-span-2",
                              },
                              {
                                name: "address",
                                label: "Physical Address",
                                className: "md:col-span-2",
                              },
                              { name: "latitude", label: "Latitude" },
                              { name: "longitude", label: "Longitude" },
                              {
                                name: "mapLocationLabel",
                                label: "Map Location Label",
                              },
                              {
                                name: "googleMapsUrl",
                                label: "Google Maps URL",
                                className: "md:col-span-2",
                              },
                              { name: "timezone", label: "Timezone" },
                              { name: "currency", label: "Currency" },
                              {
                                name: "registrationNo",
                                label: "Registration No.",
                              },
                              { name: "taxPin", label: "Tax PIN" },
                              {
                                name: "licenseNumber",
                                label: "License Number",
                              },
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
                              {
                                name: "mpesaEnabled",
                                label: "Daraja Enabled",
                                type: "select",
                                options: [
                                  { label: "Yes", value: "true" },
                                  { label: "No", value: "false" },
                                ],
                              },
                              {
                                name: "mpesaEnvironment",
                                label: "Daraja Environment",
                              },
                              {
                                name: "mpesaConsumerKey",
                                label: facility.hasMpesaConsumerKey
                                  ? "Consumer Key (saved, enter to replace)"
                                  : "Consumer Key",
                              },
                              {
                                name: "mpesaConsumerSecret",
                                label: facility.hasMpesaConsumerSecret
                                  ? "Consumer Secret (saved, enter to replace)"
                                  : "Consumer Secret",
                                type: "password",
                              },
                              {
                                name: "mpesaPasskey",
                                label: facility.hasMpesaPasskey
                                  ? "Passkey (saved, enter to replace)"
                                  : "Passkey",
                                type: "password",
                              },
                              {
                                name: "mpesaTransactionType",
                                label: "Daraja Transaction Type",
                              },
                              {
                                name: "mpesaCallbackUrl",
                                label: "Daraja Callback URL",
                                className: "md:col-span-2",
                              },
                              {
                                name: "showCashOnInvoice",
                                label: "Show Cash On Invoice",
                                type: "select",
                                options: [
                                  { label: "Yes", value: "true" },
                                  { label: "No", value: "false" },
                                ],
                              },
                              {
                                name: "showPaybillOnInvoice",
                                label: "Show Paybill On Invoice",
                                type: "select",
                                options: [
                                  { label: "Yes", value: "true" },
                                  { label: "No", value: "false" },
                                ],
                              },
                              {
                                name: "showTillOnInvoice",
                                label: "Show Till On Invoice",
                                type: "select",
                                options: [
                                  { label: "Yes", value: "true" },
                                  { label: "No", value: "false" },
                                ],
                              },
                              {
                                name: "showPochiOnInvoice",
                                label: "Show Pochi On Invoice",
                                type: "select",
                                options: [
                                  { label: "Yes", value: "true" },
                                  { label: "No", value: "false" },
                                ],
                              },
                              { name: "shaFidCode", label: "SHA FID Code" },
                              {
                                name: "shaClaimStartNumber",
                                label: "SHA Claim Start",
                              },
                              {
                                name: "shaClaimNextNumber",
                                label: "SHA Next Claim Number",
                              },
                              {
                                name: "complianceStatus",
                                label: "Compliance Status",
                                type: "select",
                                options: [
                                  { label: "Compliant", value: "COMPLIANT" },
                                  { label: "Non-compliant", value: "NON_COMPLIANT" },
                                  { label: "Suspended", value: "SUSPENDED" },
                                ],
                              },
                              {
                                name: "complianceReason",
                                label: "Compliance Reason",
                                className: "md:col-span-2",
                              },
                            ]}
                            initialValues={{
                              name: facility.name ?? "",
                              facilityType: facility.facilityType ?? "",
                              county: facility.county ?? "",
                              town: facility.town ?? "",
                              country: facility.country ?? "",
                              phone: facility.phone ?? "",
                              email: facility.email ?? "",
                              website: facility.website ?? "",
                              logoUrl: facility.logoUrl ?? "",
                              address: facility.address ?? "",
                              latitude:
                                facility.latitude !== null &&
                                facility.latitude !== undefined
                                  ? String(facility.latitude)
                                  : "",
                              longitude:
                                facility.longitude !== null &&
                                facility.longitude !== undefined
                                  ? String(facility.longitude)
                                  : "",
                              mapLocationLabel:
                                facility.mapLocationLabel ?? "",
                              googleMapsUrl: facility.googleMapsUrl ?? "",
                              timezone: facility.timezone ?? "",
                              currency: facility.currency ?? "",
                              registrationNo: facility.registrationNo ?? "",
                              taxPin: facility.taxPin ?? "",
                              licenseNumber: facility.licenseNumber ?? "",
                              mpesaShortcode: facility.mpesaShortcode ?? "",
                              mpesaPaybill: facility.mpesaPaybill ?? "",
                              mpesaAccountNumber:
                                facility.mpesaAccountNumber ?? "",
                              mpesaTillNumber: facility.mpesaTillNumber ?? "",
                              mpesaPochiNumber:
                                facility.mpesaPochiNumber ?? "",
                              mpesaEnabled: String(
                                facility.mpesaEnabled ?? false,
                              ),
                              mpesaEnvironment:
                                facility.mpesaEnvironment ?? "sandbox",
                              mpesaConsumerKey: "",
                              mpesaConsumerSecret: "",
                              mpesaPasskey: "",
                              mpesaTransactionType:
                                facility.mpesaTransactionType ?? "",
                              mpesaCallbackUrl:
                                facility.mpesaCallbackUrl ?? "",
                              showCashOnInvoice: String(
                                facility.showCashOnInvoice ?? true,
                              ),
                              showPaybillOnInvoice: String(
                                facility.showPaybillOnInvoice ?? true,
                              ),
                              showTillOnInvoice: String(
                                facility.showTillOnInvoice ?? true,
                              ),
                              showPochiOnInvoice: String(
                                facility.showPochiOnInvoice ?? true,
                              ),
                              shaFidCode: facility.shaFidCode ?? "",
                              shaClaimStartNumber: String(
                                facility.shaClaimStartNumber ?? 1,
                              ),
                              shaClaimNextNumber: String(
                                facility.shaClaimNextNumber ?? 1,
                              ),
                              complianceStatus:
                                facility.complianceStatus ?? "COMPLIANT",
                              complianceReason:
                                facility.complianceReason ?? "",
                            }}
                            onSubmit={(values) =>
                              updateFacilityMutation.mutateAsync({
                                id: facility.id,
                                payload: {
                                  name: values.name.trim(),
                                  facilityType: optionalValue(
                                    values.facilityType,
                                  ),
                                  county: optionalValue(values.county),
                                  town: optionalValue(values.town),
                                  country: optionalValue(values.country),
                                  phone: optionalValue(values.phone),
                                  email: optionalValue(values.email),
                                  website: optionalValue(values.website),
                                  logoUrl: optionalValue(values.logoUrl),
                                  address: optionalValue(values.address),
                                  latitude: optionalNumber(values.latitude),
                                  longitude: optionalNumber(values.longitude),
                                  mapLocationLabel: optionalValue(
                                    values.mapLocationLabel,
                                  ),
                                  googleMapsUrl: optionalValue(
                                    values.googleMapsUrl,
                                  ),
                                  timezone: optionalValue(values.timezone),
                                  currency: optionalValue(values.currency),
                                  registrationNo: optionalValue(
                                    values.registrationNo,
                                  ),
                                  taxPin: optionalValue(values.taxPin),
                                  licenseNumber: optionalValue(
                                    values.licenseNumber,
                                  ),
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
                                  mpesaEnabled:
                                    values.mpesaEnabled === "true",
                                  mpesaEnvironment: optionalValue(
                                    values.mpesaEnvironment,
                                  ),
                                  mpesaConsumerKey: optionalValue(
                                    values.mpesaConsumerKey,
                                  ),
                                  mpesaConsumerSecret: optionalValue(
                                    values.mpesaConsumerSecret,
                                  ),
                                  mpesaPasskey: optionalValue(
                                    values.mpesaPasskey,
                                  ),
                                  mpesaTransactionType: optionalValue(
                                    values.mpesaTransactionType,
                                  ),
                                  mpesaCallbackUrl: optionalValue(
                                    values.mpesaCallbackUrl,
                                  ),
                                  showCashOnInvoice:
                                    values.showCashOnInvoice !== "false",
                                  showPaybillOnInvoice:
                                    values.showPaybillOnInvoice !== "false",
                                  showTillOnInvoice:
                                    values.showTillOnInvoice !== "false",
                                  showPochiOnInvoice:
                                    values.showPochiOnInvoice !== "false",
                                  shaFidCode: optionalValue(
                                    values.shaFidCode,
                                  ),
                                  shaClaimStartNumber: optionalNumber(
                                    values.shaClaimStartNumber,
                                  ),
                                  shaClaimNextNumber: optionalNumber(
                                    values.shaClaimNextNumber,
                                  ),
                                  complianceStatus: optionalValue(
                                    values.complianceStatus,
                                  ),
                                  complianceReason: optionalValue(
                                    values.complianceReason,
                                  ),
                                },
                              })
                            }
                          />

                          <Button
                            size="sm"
                            variant={
                              facility.isActive === false
                                ? "default"
                                : "outline"
                            }
                            className="rounded-xl"
                            disabled={updateFacilityStatusMutation.isPending}
                            onClick={() =>
                              updateFacilityStatusMutation.mutate({
                                id: facility.id,
                                isActive: facility.isActive === false,
                              })
                            }
                          >
                            <Power className="mr-2 h-4 w-4" />
                            {facility.isActive === false
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
            <p className="text-lg font-semibold">No facilities found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a facility to begin platform setup.
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
            facilities
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
