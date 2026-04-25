"use client";

import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreateFacilityForm } from "@/components/platform/facilities/create-facility-form";
import { FacilitiesTable } from "@/components/platform/facilities/facilities-table";

export default function FacilitiesPage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border gradient-border panel-shadow p-6 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/10 via-emerald-500/5 to-transparent" />
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative space-y-3">
          <Badge className="rounded-full border-0 bg-cyan-600/10 px-3 py-1 text-cyan-700 dark:text-cyan-300">
            Platform Setup
          </Badge>

          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-cyan-500/10">
              <Building2 className="h-7 w-7 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Facilities
              </h1>
              <p className="text-muted-foreground">
                Register and manage facilities across the platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CreateFacilityForm />
      <FacilitiesTable />
    </div>
  );
}
