"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  LockKeyhole,
  Power,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useUsers } from "@/hooks/use-users";
import { useBranches } from "@/hooks/use-branches";
import { useFacilities } from "@/hooks/use-facilities";
import { useRoles } from "@/hooks/use-roles";
import { useUpdateUser } from "@/hooks/use-update-user";
import { useUpdateUserStatus } from "@/hooks/use-update-user-status";
import { useAdminResetUserPassword } from "@/hooks/use-admin-reset-user-password";
import { useDeleteUser } from "@/hooks/use-delete-user";
import { useAuth } from "@/providers/auth-provider";
import type { UserItem } from "@/services/user-service";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EditRecordDialog } from "@/components/platform/shared/edit-record-dialog";

function optionalValue(value: string) {
  return value.trim() || undefined;
}

export function UsersTable() {
  const { data, isLoading } = useUsers();
  const { data: rolesData } = useRoles();
  const { data: facilitiesData } = useFacilities();
  const { data: branchesData } = useBranches();
  const updateUserMutation = useUpdateUser();
  const updateUserStatusMutation = useUpdateUserStatus();
  const resetPasswordMutation = useAdminResetUserPassword();
  const deleteUserMutation = useDeleteUser();
  const { user: currentUser } = useAuth();

  const items = React.useMemo<UserItem[]>(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const pageSize = 8;
  const roles = Array.isArray(rolesData) ? rolesData : [];
  const facilities = Array.isArray(facilitiesData) ? facilitiesData : [];
  const branches = Array.isArray(branchesData) ? branchesData : [];

  const filteredItems = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((user) => {
      const haystack = [
        user.username,
        user.fullName,
        user.email,
        user.role?.name,
        user.role?.code,
        user.homeFacility?.name,
        user.homeBranch?.name,
        user.lockReason,
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

  const handleResetPassword = async (user: UserItem) => {
    const newPassword = window.prompt(
      `Enter new password for ${user.username}:`,
      "",
    );

    if (!newPassword) return;

    await resetPasswordMutation.mutateAsync({
      id: user.id,
      newPassword,
    });

    window.alert(`Password reset successful for ${user.username}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Users</h2>
          <p className="text-sm text-muted-foreground">
            Platform users and access control
          </p>
        </div>

        <div className="relative w-full md:w-[340px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="h-11 rounded-2xl pl-10"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.6rem] border surface-spotlight shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px]">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  User
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Role
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Facility / Branch
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Access
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Actions
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
                            <Skeleton className="h-3 w-28 rounded-lg" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-24 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-28 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-9 w-52 rounded-xl" />
                      </td>
                    </tr>
                  ))
                : pagedItems.map((user) => (
                    <tr
                      key={user.id}
                      className="border-t transition-colors hover:bg-muted/20"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10">
                            <Users className="h-5 w-5 text-module" />
                          </div>
                          <div>
                            <p className="font-semibold">
                              {user.fullName || user.username}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {user.email || user.username}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {user.role?.name || user.role?.code || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm">
                        <div>
                          <p>{user.homeFacility?.name || "No facility"}</p>
                          <p className="text-muted-foreground">
                            {user.homeBranch?.name || "No branch"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-module">
                          {user.canAccessAllBranchesInFacility
                            ? "All branches"
                            : "Limited"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
                              user.lockedAt || user.isActive === false
                                ? "bg-destructive-soft text-destructive"
                                : "bg-success-soft text-success",
                            )}
                          >
                            {user.lockedAt ? (
                              <LockKeyhole className="h-3 w-3" />
                            ) : null}
                            {user.lockedAt
                              ? "Locked"
                              : user.isActive === false
                                ? "Inactive"
                                : "Active"}
                          </span>
                          {user.failedLoginAttempts ? (
                            <p className="text-xs text-muted-foreground">
                              {user.failedLoginAttempts} failed attempt
                              {user.failedLoginAttempts === 1 ? "" : "s"}
                            </p>
                          ) : null}
                          {user.lockReason ? (
                            <p className="max-w-[220px] text-xs text-red-300">
                              {user.lockReason}
                            </p>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <EditRecordDialog
                            title={`Edit ${user.username}`}
                            description="Update account identity, role, facility scope, and branch access mode."
                            isPending={updateUserMutation.isPending}
                            fields={[
                              { name: "username", label: "Username" },
                              { name: "fullName", label: "Full Name" },
                              { name: "email", label: "Email", type: "email" },
                              {
                                name: "roleId",
                                label: "Role",
                                type: "select",
                                options: roles.map((role) => ({
                                  label: role.name
                                    ? `${role.name}${role.code ? ` (${role.code})` : ""}`
                                    : (role.code ?? `Role ${role.id}`),
                                  value: String(role.id),
                                })),
                              },
                              {
                                name: "homeFacilityId",
                                label: "Home Facility",
                                type: "select",
                                options: facilities.map((facility) => ({
                                  label: facility.name,
                                  value: String(facility.id),
                                })),
                              },
                              {
                                name: "homeBranchId",
                                label: "Home Branch",
                                type: "select",
                                options: branches.map((branch) => ({
                                  label: branch.name,
                                  value: String(branch.id),
                                })),
                              },
                              {
                                name: "canAccessAllBranchesInFacility",
                                label: "Access Mode",
                                type: "select",
                                options: [
                                  {
                                    label: "Scoped Branch Access",
                                    value: "false",
                                  },
                                  {
                                    label: "All Branches In Facility",
                                    value: "true",
                                  },
                                ],
                              },
                            ]}
                            initialValues={{
                              username: user.username ?? "",
                              fullName: user.fullName ?? "",
                              email: user.email ?? "",
                              roleId: String(user.roleId),
                              homeFacilityId: user.homeFacilityId
                                ? String(user.homeFacilityId)
                                : "",
                              homeBranchId: user.homeBranchId
                                ? String(user.homeBranchId)
                                : "",
                              canAccessAllBranchesInFacility: String(
                                user.canAccessAllBranchesInFacility === true,
                              ),
                            }}
                            onSubmit={(values) =>
                              updateUserMutation.mutateAsync({
                                id: user.id,
                                payload: {
                                  username: values.username.trim(),
                                  fullName: optionalValue(values.fullName),
                                  email: optionalValue(values.email),
                                  roleId: Number(values.roleId),
                                  homeFacilityId: values.homeFacilityId
                                    ? Number(values.homeFacilityId)
                                    : undefined,
                                  homeBranchId: values.homeBranchId
                                    ? Number(values.homeBranchId)
                                    : undefined,
                                  canAccessAllBranchesInFacility:
                                    values.canAccessAllBranchesInFacility ===
                                    "true",
                                },
                              })
                            }
                          />

                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            disabled={resetPasswordMutation.isPending}
                            onClick={() => handleResetPassword(user)}
                          >
                            <KeyRound className="mr-2 h-4 w-4" />
                            Reset Password
                          </Button>

                          <Button
                            size="sm"
                            variant={
                              user.isActive === false ? "default" : "outline"
                            }
                            className="rounded-xl"
                            disabled={updateUserStatusMutation.isPending}
                            onClick={() =>
                              updateUserStatusMutation.mutate({
                                id: user.id,
                                isActive: user.isActive === false,
                              })
                            }
                          >
                            <Power className="mr-2 h-4 w-4" />
                            {user.isActive === false
                              ? "Reactivate"
                              : "Deactivate"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-destructive/25 text-destructive hover:bg-destructive-soft"
                            disabled={
                              deleteUserMutation.isPending ||
                              user.isActive !== false ||
                              currentUser?.id === user.id
                            }
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  `Delete inactive user ${user.username}?`,
                                )
                              ) {
                                return;
                              }
                              await deleteUserMutation.mutateAsync(user.id);
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
            <p className="text-lg font-semibold">No users found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create users to continue platform setup.
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
            users
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
