"use client";

import * as React from "react";
import Link from "next/link";
import {
  BedDouble,
  CheckCircle2,
  Clock3,
  Loader2,
  LogOut,
  UserRound,
  Plus,
  Search,
  Pencil,
  Wrench,
} from "lucide-react";
import { useActiveAdmissions } from "@/hooks/use-active-admissions";
import { useDischargeAdmission } from "@/hooks/use-discharge-admission";
import { useScope } from "@/providers/scope-provider";
import type { AdmissionItem, BedItem, WardItem } from "@/services/ipd-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWards } from "@/hooks/use-wards";
import { useBeds } from "@/hooks/use-beds";
import { useCreateWard } from "@/hooks/use-create-ward";
import { useCreateBed } from "@/hooks/use-create-bed";
import { useUpdateWard } from "@/hooks/use-update-ward";
import { useUpdateBed } from "@/hooks/use-update-bed";
import { useUpdateBedStatus } from "@/hooks/use-update-bed-status";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function patientName(item: AdmissionItem) {
  const p = item.patient;
  if (!p) return "Unknown patient";
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function statusTone(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "ADMITTED":
      return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
    case "DISCHARGED":
      return "border-emerald-500/20 bg-success/10 text-emerald-300";
    default:
      return "border-white/10 bg-card/[0.04] text-muted-foreground";
  }
}

function bedStatusTone(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "AVAILABLE":
      return "border-emerald-500/20 bg-success/10 text-emerald-300";
    case "OCCUPIED":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    case "MAINTENANCE":
      return "border-rose-500/20 bg-destructive/10 text-rose-300";
    default:
      return "border-white/10 bg-card/[0.04] text-muted-foreground";
  }
}

export default function IpdPage() {
  const { facilityName, selectedBranchName } = useScope();

  const { data, isLoading } = useActiveAdmissions();
  const { data: wardsData } = useWards();
  const { data: bedsData } = useBeds();

  const dischargeMutation = useDischargeAdmission();
  const createWardMutation = useCreateWard();
  const createBedMutation = useCreateBed();
  const updateWardMutation = useUpdateWard();
  const updateBedMutation = useUpdateBed();
  const updateBedStatusMutation = useUpdateBedStatus();

  const [wardCode, setWardCode] = React.useState("");
  const [wardName, setWardName] = React.useState("");
  const [wardType, setWardType] = React.useState("");
  const [wardCapacity, setWardCapacity] = React.useState("0");

  const [bedNumber, setBedNumber] = React.useState("");
  const [bedLabel, setBedLabel] = React.useState("");
  const [bedWardId, setBedWardId] = React.useState("");
  const [bedStatusCode, setBedStatusCode] = React.useState("AVAILABLE");

  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedWardFilter, setSelectedWardFilter] = React.useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState("ALL");

  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const [editingWardId, setEditingWardId] = React.useState<number | null>(null);
  const [editWardCode, setEditWardCode] = React.useState("");
  const [editWardName, setEditWardName] = React.useState("");
  const [editWardType, setEditWardType] = React.useState("");
  const [editWardCapacity, setEditWardCapacity] = React.useState("0");
  const [editWardIsActive, setEditWardIsActive] = React.useState("true");

  const [editingBedId, setEditingBedId] = React.useState<number | null>(null);
  const [editBedNumber, setEditBedNumber] = React.useState("");
  const [editBedLabel, setEditBedLabel] = React.useState("");
  const [editBedWardId, setEditBedWardId] = React.useState("");
  const [editBedStatusCode, setEditBedStatusCode] = React.useState("AVAILABLE");
  const [editBedIsActive, setEditBedIsActive] = React.useState("true");

  const admissions = Array.isArray(data) ? data : [];
  const wards = Array.isArray(wardsData) ? wardsData : [];
  const beds = Array.isArray(bedsData) ? bedsData : [];

  const filteredAdmissions = React.useMemo(() => {
    return admissions.filter((item) => {
      const name = [
        item.patient?.firstName,
        item.patient?.middleName,
        item.patient?.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const patientNumber = (item.patient?.patientNumber || "").toLowerCase();
      const admissionNumber = (item.admissionNumber || "").toLowerCase();

      const wardIdMatch = selectedWardFilter
        ? String(item.wardId) === selectedWardFilter
        : true;

      const statusMatch =
        selectedStatusFilter === "ALL"
          ? true
          : (item.statusCode || "").toUpperCase() === selectedStatusFilter;

      const query = searchTerm.trim().toLowerCase();

      const searchMatch =
        !query ||
        name.includes(query) ||
        patientNumber.includes(query) ||
        admissionNumber.includes(query);

      return wardIdMatch && statusMatch && searchMatch;
    });
  }, [admissions, searchTerm, selectedWardFilter, selectedStatusFilter]);

  const wardOccupancy = React.useMemo(() => {
    return wards
      .filter((ward) => ward.isActive !== false)
      .map((ward) => {
        const wardBeds = beds.filter(
          (bed) => bed.isActive !== false && bed.wardId === ward.id,
        );

        const occupied = wardBeds.filter(
          (bed) => (bed.statusCode || "").toUpperCase() === "OCCUPIED",
        ).length;

        const available = wardBeds.filter(
          (bed) =>
            (bed.statusCode || "AVAILABLE").toUpperCase() === "AVAILABLE",
        ).length;

        return {
          ...ward,
          totalBeds: wardBeds.length,
          occupiedBeds: occupied,
          availableBeds: available,
          wardBeds,
        };
      });
  }, [wards, beds]);

  const totalWards = wards.filter((ward) => ward.isActive !== false).length;
  const totalBeds = beds.filter((bed) => bed.isActive !== false).length;

  const occupiedBeds = beds.filter(
    (bed) =>
      bed.isActive !== false &&
      (bed.statusCode || "").toUpperCase() === "OCCUPIED",
  ).length;

  const availableBeds = beds.filter(
    (bed) =>
      bed.isActive !== false &&
      (bed.statusCode || "AVAILABLE").toUpperCase() === "AVAILABLE",
  ).length;

  const selectedAdmission = React.useMemo(
    () =>
      filteredAdmissions.find((item) => item.id === selectedId) ??
      filteredAdmissions[0] ??
      null,
    [filteredAdmissions, selectedId],
  );

  React.useEffect(() => {
    if (!selectedId && filteredAdmissions.length > 0) {
      setSelectedId(filteredAdmissions[0].id);
      return;
    }

    if (
      selectedId &&
      filteredAdmissions.length > 0 &&
      !filteredAdmissions.some((item) => item.id === selectedId)
    ) {
      setSelectedId(filteredAdmissions[0].id);
      return;
    }

    if (filteredAdmissions.length === 0) {
      setSelectedId(null);
    }
  }, [filteredAdmissions, selectedId]);

  const handleDischargeSelected = async () => {
    if (!selectedAdmission) return;
    setMessage(null);
    await dischargeMutation.mutateAsync(selectedAdmission.id);
    setMessage(
      `Admission ${selectedAdmission.admissionNumber} discharged successfully.`,
    );
  };

  const handleDischargeItem = async (admissionId: number) => {
    setMessage(null);
    await dischargeMutation.mutateAsync(admissionId);
    setMessage("Patient discharged successfully.");
  };

  const handleCreateWard = async () => {
    if (!wardCode.trim() || !wardName.trim()) {
      setMessage("Ward code and ward name are required.");
      return;
    }

    setMessage(null);

    await createWardMutation.mutateAsync({
      code: wardCode.trim(),
      name: wardName.trim(),
      wardType: wardType || undefined,
      capacity: wardCapacity ? Number(wardCapacity) : 0,
      isActive: true,
    });

    setWardCode("");
    setWardName("");
    setWardType("");
    setWardCapacity("0");
    setMessage("Ward created successfully.");
  };

  const handleCreateBed = async () => {
    if (!bedNumber.trim() || !bedWardId) {
      setMessage("Bed number and ward are required.");
      return;
    }

    setMessage(null);

    await createBedMutation.mutateAsync({
      bedNumber: bedNumber.trim(),
      bedLabel: bedLabel || undefined,
      wardId: Number(bedWardId),
      statusCode: bedStatusCode || "AVAILABLE",
      isActive: true,
    });

    setBedNumber("");
    setBedLabel("");
    setBedWardId("");
    setBedStatusCode("AVAILABLE");
    setMessage("Bed created successfully.");
  };

  const startEditWard = (ward: WardItem) => {
    setEditingWardId(ward.id);
    setEditWardCode(ward.code || "");
    setEditWardName(ward.name || "");
    setEditWardType(ward.wardType || "");
    setEditWardCapacity(String(ward.capacity ?? 0));
    setEditWardIsActive(ward.isActive === false ? "false" : "true");
  };

  const cancelEditWard = () => {
    setEditingWardId(null);
    setEditWardCode("");
    setEditWardName("");
    setEditWardType("");
    setEditWardCapacity("0");
    setEditWardIsActive("true");
  };

  const handleSaveWardEdit = async () => {
    if (!editingWardId) return;

    if (!editWardCode.trim() || !editWardName.trim()) {
      setMessage("Ward code and ward name are required.");
      return;
    }

    setMessage(null);

    await updateWardMutation.mutateAsync({
      id: editingWardId,
      payload: {
        code: editWardCode.trim(),
        name: editWardName.trim(),
        wardType: editWardType || undefined,
        capacity: editWardCapacity ? Number(editWardCapacity) : 0,
        isActive: editWardIsActive === "true",
      },
    });

    cancelEditWard();
    setMessage("Ward updated successfully.");
  };

  const startEditBed = (bed: BedItem) => {
    setEditingBedId(bed.id);
    setEditBedNumber(bed.bedNumber || "");
    setEditBedLabel(bed.bedLabel || "");
    setEditBedWardId(String(bed.wardId));
    setEditBedStatusCode((bed.statusCode || "AVAILABLE").toUpperCase());
    setEditBedIsActive(bed.isActive === false ? "false" : "true");
  };

  const cancelEditBed = () => {
    setEditingBedId(null);
    setEditBedNumber("");
    setEditBedLabel("");
    setEditBedWardId("");
    setEditBedStatusCode("AVAILABLE");
    setEditBedIsActive("true");
  };

  const handleSaveBedEdit = async () => {
    if (!editingBedId) return;

    if (!editBedNumber.trim() || !editBedWardId) {
      setMessage("Bed number and ward are required.");
      return;
    }

    setMessage(null);

    await updateBedMutation.mutateAsync({
      id: editingBedId,
      payload: {
        bedNumber: editBedNumber.trim(),
        bedLabel: editBedLabel || undefined,
        wardId: Number(editBedWardId),
        statusCode: editBedStatusCode,
        isActive: editBedIsActive === "true",
      },
    });

    cancelEditBed();
    setMessage("Bed updated successfully.");
  };

  const handleChangeBedStatus = async (
    bedId: number,
    statusCode: "AVAILABLE" | "MAINTENANCE",
  ) => {
    setMessage(null);

    await updateBedStatusMutation.mutateAsync({
      id: bedId,
      payload: { statusCode },
    });

    setMessage(`Bed status changed to ${statusCode}.`);
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border surface-spotlight shadow-md p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-600/10 via-cyan-500/5 to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full border-0 bg-primary/10 px-3 py-1 text-module">
              Inpatient Department
            </Badge>

            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
                <BedDouble className="h-7 w-7 text-primary" />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  IPD Admissions
                </h1>
                <p className="text-muted-foreground">
                  Active admissions, ward placement, bed management, and discharge workflow
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:w-[560px]">
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

            <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Active Admissions
              </p>
              <p className="mt-2 text-sm font-semibold">{admissions.length}</p>
            </div>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-[1.4rem] border border-cyan-500/20 bg-cyan-500/8 px-4 py-4 text-sm text-cyan-300">
          {message}
        </div>
      ) : null}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Total Wards</p>
              <p className="mt-2 text-2xl font-bold">{totalWards}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <BedDouble className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Total Beds</p>
              <p className="mt-2 text-2xl font-bold">{totalBeds}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <BedDouble className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Occupied Beds</p>
              <p className="mt-2 text-2xl font-bold">{occupiedBeds}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Available Beds</p>
              <p className="mt-2 text-2xl font-bold">{availableBeds}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Clock3 className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
          <CardHeader>
            <CardTitle>Create Ward</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Ward Code</label>
                <Input
                  value={wardCode}
                  onChange={(e) => setWardCode(e.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder="WARD-MALE-01"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Ward Name</label>
                <Input
                  value={wardName}
                  onChange={(e) => setWardName(e.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder="Male Ward"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Ward Type</label>
                <Input
                  value={wardType}
                  onChange={(e) => setWardType(e.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder="General / ICU / Pediatric"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Capacity</label>
                <Input
                  type="number"
                  value={wardCapacity}
                  onChange={(e) => setWardCapacity(e.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder="10"
                />
              </div>
            </div>

            <Button
              type="button"
              className="h-12 rounded-2xl"
              onClick={handleCreateWard}
              disabled={createWardMutation.isPending}
            >
              {createWardMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Save Ward
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
          <CardHeader>
            <CardTitle>Create Bed</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Bed Number</label>
                <Input
                  value={bedNumber}
                  onChange={(e) => setBedNumber(e.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder="BED-001"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Bed Label</label>
                <Input
                  value={bedLabel}
                  onChange={(e) => setBedLabel(e.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder="Near nurses station"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Ward</label>
                <select
                  value={bedWardId}
                  onChange={(e) => setBedWardId(e.target.value)}
                  className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
                >
                  <option value="">Select ward</option>
                  {wards.map((ward) => (
                    <option key={ward.id} value={String(ward.id)}>
                      {ward.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Status</label>
                <select
                  value={bedStatusCode}
                  onChange={(e) => setBedStatusCode(e.target.value)}
                  className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="OCCUPIED">OCCUPIED</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                </select>
              </div>
            </div>

            <Button
              type="button"
              className="h-12 rounded-2xl"
              onClick={handleCreateBed}
              disabled={createBedMutation.isPending}
            >
              {createBedMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Save Bed
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-cyan-300" />
              Ward Occupancy
            </CardTitle>
            <Badge className="rounded-full border-0 bg-cyan-600/10 px-3 py-1 text-cyan-300">
              {wardOccupancy.length} wards
            </Badge>
          </CardHeader>

          <CardContent className="space-y-4">
            {wardOccupancy.length === 0 ? (
              <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                No wards found.
              </div>
            ) : (
              wardOccupancy.map((ward) => (
                <div
                  key={ward.id}
                  className="rounded-[1.3rem] border border-white/10 bg-card/[0.03] p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{ward.name}</p>
                        <Badge className="rounded-full border border-white/10 bg-card/[0.04] px-3 py-1 text-xs">
                          {ward.code}
                        </Badge>
                        <Badge
                          className={`rounded-full border px-3 py-1 text-xs ${
                            ward.isActive === false
                              ? "border-rose-500/20 bg-destructive/10 text-rose-300"
                              : "border-emerald-500/20 bg-success/10 text-emerald-300"
                          }`}
                        >
                          {ward.isActive === false ? "Inactive" : "Active"}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        Type: {ward.wardType || "—"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Capacity: {ward.capacity ?? 0}
                      </p>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => startEditWard(ward)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Ward
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                      <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                        <p className="text-xs text-muted-foreground">Total Beds</p>
                        <p className="mt-1 text-sm font-semibold">{ward.totalBeds}</p>
                      </div>

                      <div className="rounded-[1rem] border border-amber-500/20 bg-amber-500/10 p-3">
                        <p className="text-xs text-amber-200/80">Occupied</p>
                        <p className="mt-1 text-sm font-semibold text-amber-300">
                          {ward.occupiedBeds}
                        </p>
                      </div>

                      <div className="rounded-[1rem] border border-emerald-500/20 bg-success/10 p-3">
                        <p className="text-xs text-emerald-200/80">Available</p>
                        <p className="mt-1 text-sm font-semibold text-emerald-300">
                          {ward.availableBeds}
                        </p>
                      </div>
                    </div>
                  </div>

                  {editingWardId === ward.id ? (
                    <div className="mt-4 rounded-[1.2rem] border border-cyan-500/20 bg-cyan-500/5 p-4">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <div>
                          <label className="mb-2 block text-sm font-medium">Code</label>
                          <Input
                            value={editWardCode}
                            onChange={(e) => setEditWardCode(e.target.value)}
                            className="h-12 rounded-2xl"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium">Name</label>
                          <Input
                            value={editWardName}
                            onChange={(e) => setEditWardName(e.target.value)}
                            className="h-12 rounded-2xl"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium">Type</label>
                          <Input
                            value={editWardType}
                            onChange={(e) => setEditWardType(e.target.value)}
                            className="h-12 rounded-2xl"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium">Capacity</label>
                          <Input
                            type="number"
                            value={editWardCapacity}
                            onChange={(e) => setEditWardCapacity(e.target.value)}
                            className="h-12 rounded-2xl"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium">Active</label>
                          <select
                            value={editWardIsActive}
                            onChange={(e) => setEditWardIsActive(e.target.value)}
                            className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button
                          type="button"
                          className="rounded-2xl"
                          onClick={handleSaveWardEdit}
                          disabled={updateWardMutation.isPending}
                        >
                          {updateWardMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}
                          Save Ward Changes
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl"
                          onClick={cancelEditWard}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {ward.wardBeds.length > 0 ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {ward.wardBeds.map((bed) => (
                        <div
                          key={bed.id}
                          className="rounded-[1rem] border border-white/10 bg-black/10 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{bed.bedNumber}</p>
                              <p className="text-sm text-muted-foreground">
                                {bed.bedLabel || "No label"}
                              </p>
                            </div>

                            <Badge
                              className={`rounded-full border px-3 py-1 text-xs ${bedStatusTone(
                                bed.statusCode,
                              )}`}
                            >
                              {(bed.statusCode || "AVAILABLE").toUpperCase()}
                            </Badge>
                          </div>

                          <p className="mt-2 text-xs text-muted-foreground">
                            {bed.isActive === false ? "Inactive bed" : "Active bed"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-2xl"
                              onClick={() => startEditBed(bed)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Button>

                            {(bed.statusCode || "").toUpperCase() !== "AVAILABLE" ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-2xl"
                                onClick={() => handleChangeBedStatus(bed.id, "AVAILABLE")}
                                disabled={updateBedStatusMutation.isPending}
                              >
                                {updateBedStatusMutation.isPending ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                )}
                                Available
                              </Button>
                            ) : null}

                            {(bed.statusCode || "").toUpperCase() !== "MAINTENANCE" ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-2xl"
                                onClick={() => handleChangeBedStatus(bed.id, "MAINTENANCE")}
                                disabled={updateBedStatusMutation.isPending}
                              >
                                {updateBedStatusMutation.isPending ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Wrench className="mr-2 h-4 w-4" />
                                )}
                                Maintenance
                              </Button>
                            ) : null}
                          </div>

                          {editingBedId === bed.id ? (
                            <div className="mt-4 rounded-[1rem] border border-cyan-500/20 bg-cyan-500/5 p-3">
                              <div className="grid gap-3">
                                <div>
                                  <label className="mb-2 block text-sm font-medium">
                                    Bed Number
                                  </label>
                                  <Input
                                    value={editBedNumber}
                                    onChange={(e) => setEditBedNumber(e.target.value)}
                                    className="h-12 rounded-2xl"
                                  />
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-medium">
                                    Bed Label
                                  </label>
                                  <Input
                                    value={editBedLabel}
                                    onChange={(e) => setEditBedLabel(e.target.value)}
                                    className="h-12 rounded-2xl"
                                  />
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-medium">Ward</label>
                                  <select
                                    value={editBedWardId}
                                    onChange={(e) => setEditBedWardId(e.target.value)}
                                    className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
                                  >
                                    <option value="">Select ward</option>
                                    {wards.map((itemWard) => (
                                      <option key={itemWard.id} value={String(itemWard.id)}>
                                        {itemWard.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-medium">
                                    Status
                                  </label>
                                  <select
                                    value={editBedStatusCode}
                                    onChange={(e) => setEditBedStatusCode(e.target.value)}
                                    className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
                                  >
                                    <option value="AVAILABLE">AVAILABLE</option>
                                    <option value="OCCUPIED">OCCUPIED</option>
                                    <option value="MAINTENANCE">MAINTENANCE</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-medium">
                                    Active
                                  </label>
                                  <select
                                    value={editBedIsActive}
                                    onChange={(e) => setEditBedIsActive(e.target.value)}
                                    className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
                                  >
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                  </select>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  className="rounded-2xl"
                                  onClick={handleSaveBedEdit}
                                  disabled={updateBedMutation.isPending}
                                >
                                  {updateBedMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                  )}
                                  Save Bed
                                </Button>

                                <Button
                                  type="button"
                                  variant="outline"
                                  className="rounded-2xl"
                                  onClick={cancelEditBed}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[1rem] border border-dashed border-white/10 bg-card/[0.02] p-4 text-sm text-muted-foreground">
                      No beds in this ward yet.
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
          <CardHeader>
            <CardTitle>Admission Filters</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Search patient or admission
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 rounded-2xl pl-10"
                  placeholder="Patient name, patient number, admission number"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Ward</label>
              <select
                value={selectedWardFilter}
                onChange={(e) => setSelectedWardFilter(e.target.value)}
                className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
              >
                <option value="">All wards</option>
                {wards.map((ward) => (
                  <option key={ward.id} value={String(ward.id)}>
                    {ward.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Status</label>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
              >
                <option value="ALL">All statuses</option>
                <option value="ADMITTED">ADMITTED</option>
                <option value="DISCHARGED">DISCHARGED</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Admissions</CardTitle>
            <Badge className="rounded-full border-0 bg-cyan-600/10 px-3 py-1 text-cyan-300">
              {filteredAdmissions.length} shown
            </Badge>
          </CardHeader>

          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[1.3rem] border border-white/10 bg-card/[0.03] p-4"
                >
                  <div className="h-5 w-40 rounded bg-card/10" />
                  <div className="mt-3 h-4 w-56 rounded bg-card/10" />
                </div>
              ))
            ) : filteredAdmissions.length === 0 ? (
              <div className="rounded-[1.3rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                No admissions match your filters.
              </div>
            ) : (
              filteredAdmissions.map((item) => {
                const active = selectedAdmission?.id === item.id;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "w-full rounded-[1.3rem] border p-4 text-left transition-all",
                      active
                        ? "border-cyan-400/40 bg-cyan-500/10"
                        : "border-white/10 bg-card/[0.03] hover:bg-card/[0.05]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {patientName(item)}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.patient?.patientNumber || item.admissionNumber}
                          </p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Ward: {item.ward?.name || "Not assigned"} • Bed:{" "}
                            {item.bed?.bedNumber || "Not assigned"}
                          </p>
                        </div>

                        <Badge
                          className={`rounded-full border px-3 py-1 ${statusTone(item.statusCode)}`}
                        >
                          {item.statusCode}
                        </Badge>
                      </div>
                    </button>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link href={`/ipd/${item.id}`}>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl"
                        >
                          Open
                        </Button>
                      </Link>

                      {(item.statusCode || "").toUpperCase() === "ADMITTED" ? (
                        <Button
                          type="button"
                          className="rounded-2xl"
                          onClick={() => handleDischargeItem(item.id)}
                          disabled={dischargeMutation.isPending}
                        >
                          {dischargeMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <LogOut className="mr-2 h-4 w-4" />
                          )}
                          Discharge
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
          <CardHeader>
            <CardTitle>Admission Details</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            {!selectedAdmission ? (
              <div className="rounded-[1.3rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                Select an admission from the list.
              </div>
            ) : (
              <>
                <div className="rounded-[1.3rem] border border-white/10 bg-card/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <UserRound className="h-5 w-5 text-primary" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-lg font-bold">
                        {patientName(selectedAdmission)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedAdmission.patient?.patientNumber ||
                          "No patient number"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                      <p className="text-xs text-muted-foreground">
                        Admission Number
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedAdmission.admissionNumber}
                      </p>
                    </div>

                    <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedAdmission.statusCode}
                      </p>
                    </div>

                    <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                      <p className="text-xs text-muted-foreground">Ward</p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedAdmission.ward?.name || "—"}
                      </p>
                    </div>

                    <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                      <p className="text-xs text-muted-foreground">Bed</p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedAdmission.bed?.bedNumber || "—"}
                      </p>
                    </div>

                    <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                      <p className="text-xs text-muted-foreground">
                        Admitted At
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {formatDate(selectedAdmission.admittedAt)}
                      </p>
                    </div>

                    <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                      <p className="text-xs text-muted-foreground">
                        Expected Discharge
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {formatDate(selectedAdmission.expectedDischargeAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
                  <p className="text-xs text-muted-foreground">
                    Admission Reason
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {selectedAdmission.admissionReason || "—"}
                  </p>

                  <p className="mt-4 text-xs text-muted-foreground">
                    Admission Source
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {selectedAdmission.admissionSource || "—"}
                  </p>

                  <p className="mt-4 text-xs text-muted-foreground">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
                    {selectedAdmission.notes || "—"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link href={`/ipd/${selectedAdmission.id}`}>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 rounded-2xl"
                    >
                      Open Admission Page
                    </Button>
                  </Link>

                  {(selectedAdmission.statusCode || "").toUpperCase() ===
                  "ADMITTED" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 rounded-2xl"
                      onClick={handleDischargeSelected}
                      disabled={dischargeMutation.isPending}
                    >
                      {dischargeMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="mr-2 h-4 w-4" />
                      )}
                      Discharge Patient
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
