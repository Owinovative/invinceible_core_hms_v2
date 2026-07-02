"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Power,
  Search,
  Trash2,
  UserCog,
} from "lucide-react";
import { useStaff } from "@/hooks/use-staff";
import { useBranches } from "@/hooks/use-branches";
import { useFacilities } from "@/hooks/use-facilities";
import { useRoles } from "@/hooks/use-roles";
import { useUsers } from "@/hooks/use-users";
import { useUpdateStaff } from "@/hooks/use-update-staff";
import { useUpdateStaffStatus } from "@/hooks/use-update-staff-status";
import { useDeleteStaff } from "@/hooks/use-delete-staff";
import { useAuth } from "@/providers/auth-provider";
import type { StaffItem } from "@/services/staff-service";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EditRecordDialog } from "@/components/platform/shared/edit-record-dialog";

function fullName(item: StaffItem) {
  return [item.firstName, item.lastName].filter(Boolean).join(" ");
}

function optionalValue(value: string) {
  return value.trim() || undefined;
}

export function StaffTable() {
  const { data, isLoading } = useStaff();
  const { data: facilitiesData } = useFacilities();
  const { data: branchesData } = useBranches();
  const { data: rolesData } = useRoles();
  const { data: usersData } = useUsers();
  const updateStaffMutation = useUpdateStaff();
  const updateStaffStatusMutation = useUpdateStaffStatus();
  const deleteStaffMutation = useDeleteStaff();
  const { user: currentUser } = useAuth();

  const items = React.useMemo<StaffItem[]>(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const pageSize = 8;
  const facilities = Array.isArray(facilitiesData) ? facilitiesData : [];
  const branches = Array.isArray(branchesData) ? branchesData : [];
  const roles = Array.isArray(rolesData) ? rolesData : [];
  const users = Array.isArray(usersData) ? usersData : [];

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

      <div className="overflow-hidden rounded-[1.6rem] border surface-spotlight shadow-md">
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
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-24 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-24 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-32 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-24 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-9 w-28 rounded-xl" />
                      </td>
                    </tr>
                  ))
                : pagedItems.map((staff) => (
                    <tr
                      key={staff.id}
                      className="border-t transition-colors hover:bg-muted/20"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10">
                            {staff.passportPhotoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={staff.passportPhotoUrl}
                                alt=""
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              <UserCog className="h-5 w-5 text-module" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">{fullName(staff)}</p>
                            <p className="text-sm text-muted-foreground">
                              {staff.email || staff.phone || "No contact"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ID: {staff.nationalIdNumber || "Not recorded"}
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
                            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-module">
                              Clinician
                            </span>
                          ) : null}
                          {staff.isPrescriber ? (
                            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-module">
                              Prescriber
                            </span>
                          ) : null}
                          {staff.canLogin ? (
                            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-module">
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
                              ? "bg-destructive-soft text-destructive"
                              : "bg-success-soft text-success",
                          )}
                        >
                          {staff.isActive === false ? "Inactive" : "Active"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <EditRecordDialog
                            title={`Edit ${fullName(staff)}`}
                            description="Update staff identity, assignment, clinical flags, and linked user."
                            isPending={updateStaffMutation.isPending}
                            fields={[
                              { name: "staffCode", label: "Staff Code" },
                              { name: "firstName", label: "First Name" },
                              { name: "lastName", label: "Last Name" },
                              { name: "email", label: "Email", type: "email" },
                              { name: "phone", label: "Phone" },
                              {
                                name: "gender",
                                label: "Gender",
                                type: "select",
                                options: [
                                  { label: "Male", value: "MALE" },
                                  { label: "Female", value: "FEMALE" },
                                  { label: "Other", value: "OTHER" },
                                ],
                              },
                              { name: "designation", label: "Designation" },
                              {
                                name: "nationalIdNumber",
                                label: "National ID Number",
                              },
                              {
                                name: "nationalIdImageUrl",
                                label: "National ID Image",
                                type: "fileDataUrl",
                                className: "md:col-span-2",
                              },
                              {
                                name: "passportPhotoUrl",
                                label: "Passport Photo",
                                type: "fileDataUrl",
                                className: "md:col-span-2",
                              },
                              {
                                name: "clinicianRegistrationNumber",
                                label: "Clinician Registration No.",
                              },
                              {
                                name: "clinicianBoard",
                                label: "Registration Board",
                                type: "select",
                                options: [
                                  "Kenya Medical Practitioners and Dentists Council",
                                  "Clinical Officers Council",
                                  "Nursing Council of Kenya",
                                  "Pharmacy and Poisons Board",
                                  "Kenya Medical Laboratory Technicians and Technologists Board",
                                  "Radiation Protection Board",
                                  "Physiotherapy Council of Kenya",
                                  "Kenya Nutritionists and Dieticians Institute",
                                  "Public Health Officers and Technicians Council",
                                ].map((board) => ({
                                  label: board,
                                  value: board,
                                })),
                              },
                              {
                                name: "facilityId",
                                label: "Facility",
                                type: "select",
                                options: facilities.map((facility) => ({
                                  label: facility.name,
                                  value: String(facility.id),
                                })),
                              },
                              {
                                name: "branchId",
                                label: "Branch",
                                type: "select",
                                options: branches.map((branch) => ({
                                  label: branch.name,
                                  value: String(branch.id),
                                })),
                              },
                              {
                                name: "roleId",
                                label: "Role",
                                type: "select",
                                options: roles.map((role) => ({
                                  label:
                                    role.name ?? role.code ?? `Role ${role.id}`,
                                  value: String(role.id),
                                })),
                              },
                              {
                                name: "userId",
                                label: "Linked User",
                                type: "select",
                                options: users.map((user) => ({
                                  label: user.fullName
                                    ? `${user.fullName} (${user.username})`
                                    : user.username,
                                  value: String(user.id),
                                })),
                              },
                              {
                                name: "isClinician",
                                label: "Clinician",
                                type: "select",
                                options: [
                                  { label: "Yes", value: "true" },
                                  { label: "No", value: "false" },
                                ],
                              },
                              {
                                name: "isPrescriber",
                                label: "Prescriber",
                                type: "select",
                                options: [
                                  { label: "Yes", value: "true" },
                                  { label: "No", value: "false" },
                                ],
                              },
                              {
                                name: "canLogin",
                                label: "Can Login",
                                type: "select",
                                options: [
                                  { label: "Yes", value: "true" },
                                  { label: "No", value: "false" },
                                ],
                              },
                            ]}
                            initialValues={{
                              staffCode: staff.staffCode ?? "",
                              firstName: staff.firstName ?? "",
                              lastName: staff.lastName ?? "",
                              email: staff.email ?? "",
                              phone: staff.phone ?? "",
                              gender: staff.gender ?? "OTHER",
                              designation: staff.designation ?? "",
                              nationalIdNumber: staff.nationalIdNumber ?? "",
                              nationalIdImageUrl:
                                staff.nationalIdImageUrl ?? "",
                              passportPhotoUrl: staff.passportPhotoUrl ?? "",
                              clinicianRegistrationNumber:
                                staff.clinicianRegistrationNumber ?? "",
                              clinicianBoard: staff.clinicianBoard ?? "",
                              facilityId: String(staff.facilityId),
                              branchId: staff.branchId
                                ? String(staff.branchId)
                                : "",
                              roleId: String(staff.roleId),
                              userId: staff.userId ? String(staff.userId) : "",
                              isClinician: String(staff.isClinician === true),
                              isPrescriber: String(staff.isPrescriber === true),
                              canLogin: String(staff.canLogin !== false),
                            }}
                            onSubmit={(values) =>
                              updateStaffMutation.mutateAsync({
                                id: staff.id,
                                payload: {
                                  staffCode: values.staffCode.trim(),
                                  firstName: values.firstName.trim(),
                                  lastName: values.lastName.trim(),
                                  email: optionalValue(values.email),
                                  phone: optionalValue(values.phone),
                                  gender: optionalValue(values.gender),
                                  designation: optionalValue(
                                    values.designation,
                                  ),
                                  nationalIdNumber: optionalValue(
                                    values.nationalIdNumber,
                                  ),
                                  nationalIdImageUrl: optionalValue(
                                    values.nationalIdImageUrl,
                                  ),
                                  passportPhotoUrl: optionalValue(
                                    values.passportPhotoUrl,
                                  ),
                                  clinicianRegistrationNumber: optionalValue(
                                    values.clinicianRegistrationNumber,
                                  ),
                                  clinicianBoard: optionalValue(
                                    values.clinicianBoard,
                                  ),
                                  facilityId: Number(values.facilityId),
                                  branchId: values.branchId
                                    ? Number(values.branchId)
                                    : undefined,
                                  roleId: Number(values.roleId),
                                  userId: values.userId
                                    ? Number(values.userId)
                                    : undefined,
                                  isClinician: values.isClinician === "true",
                                  isPrescriber: values.isPrescriber === "true",
                                  canLogin: values.canLogin !== "false",
                                },
                              })
                            }
                          />

                          <Button
                            size="sm"
                            variant={
                              staff.isActive === false ? "default" : "outline"
                            }
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
                            {staff.isActive === false
                              ? "Reactivate"
                              : "Deactivate"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-destructive/25 text-destructive hover:bg-destructive-soft"
                            disabled={
                              deleteStaffMutation.isPending ||
                              staff.isActive !== false ||
                              currentUser?.staffId === staff.id ||
                              currentUser?.id === staff.userId
                            }
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  `Delete inactive staff record ${fullName(
                                    staff,
                                  )}?`,
                                )
                              ) {
                                return;
                              }
                              await deleteStaffMutation.mutateAsync(staff.id);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
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
            <span className="font-semibold text-foreground">
              {pagedItems.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">
              {filteredItems.length}
            </span>{" "}
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
