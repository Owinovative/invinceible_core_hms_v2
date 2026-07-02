"use client";

import * as React from "react";
import { Save, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateUser } from "@/hooks/use-create-user";
import { useRoles } from "@/hooks/use-roles";
import { useFacilities } from "@/hooks/use-facilities";
import { useBranches } from "@/hooks/use-branches";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const userSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  password: z.string().min(4, "Password must be at least 4 characters"),
  fullName: z.string().optional(),
  roleId: z.string().min(1, "Role is required"),
  homeFacilityId: z.string().optional(),
  homeBranchId: z.string().optional(),
  canAccessAllBranchesInFacility: z.string().optional(),
  isActive: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

export function CreateUserForm() {
  const createUserMutation = useCreateUser();
  const { data: rolesData } = useRoles();
  const { data: facilitiesData } = useFacilities();
  const { data: branchesData } = useBranches();

  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const roles = Array.isArray(rolesData) ? rolesData.filter((role) => role.isActive !== false) : [];
  const facilities = Array.isArray(facilitiesData)
    ? facilitiesData.filter((facility) => facility.isActive !== false)
    : [];
  const branches = Array.isArray(branchesData)
    ? branchesData.filter((branch) => branch.isActive !== false)
    : [];

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      fullName: "",
      roleId: "",
      homeFacilityId: "",
      homeBranchId: "",
      canAccessAllBranchesInFacility: "false",
      isActive: "true",
    },
  });

  const selectedFacilityId = form.watch("homeFacilityId");

  const filteredBranches = React.useMemo(() => {
    if (!selectedFacilityId) return branches;
    return branches.filter(
      (branch) => String(branch.facilityId) === String(selectedFacilityId),
    );
  }, [branches, selectedFacilityId]);

  React.useEffect(() => {
    const currentBranchId = form.getValues("homeBranchId");
    if (!currentBranchId) return;

    const branchStillValid = filteredBranches.some(
      (branch) => String(branch.id) === String(currentBranchId),
    );

    if (!branchStillValid) {
      form.setValue("homeBranchId", "");
    }
  }, [filteredBranches, form]);

  const onSubmit = async (values: UserFormValues) => {
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await createUserMutation.mutateAsync({
        username: values.username,
        email: values.email || undefined,
        password: values.password,
        fullName: values.fullName || undefined,
        roleId: Number(values.roleId),
        homeFacilityId: values.homeFacilityId
          ? Number(values.homeFacilityId)
          : undefined,
        homeBranchId: values.homeBranchId
          ? Number(values.homeBranchId)
          : undefined,
        canAccessAllBranchesInFacility:
          values.canAccessAllBranchesInFacility === "true",
        isActive: values.isActive !== "false",
      });

      setSuccessMessage("User created successfully.");

      form.reset({
        username: "",
        email: "",
        password: "",
        fullName: "",
        roleId: "",
        homeFacilityId: "",
        homeBranchId: "",
        canAccessAllBranchesInFacility: "false",
        isActive: "true",
      });
    } catch (error: any) {
      setSuccessMessage(null);
      // Extract a readable message from the backend error, if available
      const backendMessage = error?.response?.data?.message || error?.message || "An unknown error occurred.";
      setErrorMessage(`Failed to create user: ${backendMessage}`);
      console.error("USER CREATION FAILED:", error?.response?.data || error.message || error);
    }
  };

  return (
    <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-module" />
          New User
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="superadmin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="System Administrator" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" type="email" placeholder="admin@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" type="password" placeholder="Enter password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={String(role.id)}>
                          {role.name} {role.code ? `(${role.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="homeFacilityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Home Facility</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select facility" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {facilities.map((facility) => (
                        <SelectItem key={facility.id} value={String(facility.id)}>
                          {facility.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="homeBranchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Home Branch</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    disabled={!selectedFacilityId}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredBranches.map((branch) => (
                        <SelectItem key={branch.id} value={String(branch.id)}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canAccessAllBranchesInFacility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Mode</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "false"}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select access mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="false">Scoped Branch Access</SelectItem>
                      <SelectItem value="true">All Branches In Facility</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "true"}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 space-y-3 pt-2">
              {errorMessage ? (
                <div className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              ) : createUserMutation.isError ? (
                <div className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  Failed to create user.
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">
                  {successMessage}
                </div>
              ) : null}

              <Button
                type="submit"
                className="h-11 rounded-xl px-6"
                disabled={createUserMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {createUserMutation.isPending ? "Saving..." : "Create User"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
