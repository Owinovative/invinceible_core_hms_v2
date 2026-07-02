"use client";

import * as React from "react";
import { Building2, MapPin } from "lucide-react";
import { useFacilities } from "@/hooks/use-facilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateFacilityForm } from "@/components/platform/facilities/create-facility-form";
import { FacilityMpesaSettingsPanel } from "@/components/platform/facilities/facility-mpesa-settings-panel";
import { FacilitiesTable } from "@/components/platform/facilities/facilities-table";

export default function FacilitiesPage() {
  const { data } = useFacilities();
  const facilities = Array.isArray(data) ? data : [];
  const mappedFacilities = facilities.filter(
    (facility) => facility.latitude && facility.longitude,
  );
  const [activeFacilityId, setActiveFacilityId] = React.useState<number | null>(
    null,
  );
  const activeFacility =
    mappedFacilities.find((facility) => facility.id === activeFacilityId) ??
    mappedFacilities[0] ??
    null;

  React.useEffect(() => {
    if (!activeFacilityId && mappedFacilities[0]) {
      setActiveFacilityId(mappedFacilities[0].id);
    }
  }, [activeFacilityId, mappedFacilities]);

  const mapUrl = activeFacility
    ? `https://maps.google.com/maps?q=${activeFacility.latitude},${activeFacility.longitude}&z=15&output=embed`
    : "";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border surface-spotlight shadow-md p-6 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/10 via-emerald-500/5 to-transparent" />
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative space-y-3">
          <Badge className="rounded-full border-0 bg-cyan-600/10 px-3 py-1 text-module">
            Platform Setup
          </Badge>

          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-cyan-500/10">
              <Building2 className="h-7 w-7 text-module" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Facilities
              </h1>
              <p className="text-muted-foreground">
                Register facilities, configure locations, and manage per-facility M-Pesa Daraja settings.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CreateFacilityForm />
      <FacilityMpesaSettingsPanel />
      <section className="grid gap-4 rounded-[1.4rem] border bg-card p-5 shadow-sm xl:grid-cols-[0.8fr_1.2fr]">
        <div>
          <Badge className="rounded-md border-0 bg-accent text-module">
            Facility map
          </Badge>
          <h2 className="mt-3 text-2xl font-bold text-foreground">
            Mapped Facilities
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Super admins can confirm every registered facility has real
            coordinates before go-live.
          </p>

          <div className="mt-4 max-h-[360px] space-y-2 overflow-auto pr-2">
            {mappedFacilities.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                No facility coordinates have been recorded yet.
              </div>
            ) : (
              mappedFacilities.map((facility) => (
                <Button
                  key={facility.id}
                  type="button"
                  variant={activeFacility?.id === facility.id ? "default" : "outline"}
                  className="h-auto w-full justify-start rounded-xl py-3 text-left"
                  onClick={() => setActiveFacilityId(facility.id)}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {facility.name}
                    </span>
                    <span className="block truncate text-xs opacity-80">
                      {facility.mapLocationLabel ||
                        `${facility.latitude}, ${facility.longitude}`}
                    </span>
                  </span>
                </Button>
              ))
            )}
          </div>
        </div>

        <div className="min-h-[360px] overflow-hidden rounded-xl border bg-surface-2">
          {mapUrl ? (
            <iframe
              title="Mapped facility location"
              src={mapUrl}
              className="h-[420px] w-full border-0"
              loading="lazy"
            />
          ) : (
            <div className="grid h-[360px] place-items-center text-sm text-muted-foreground">
              Select a mapped facility.
            </div>
          )}
        </div>
      </section>
      <FacilitiesTable />
    </div>
  );
}
