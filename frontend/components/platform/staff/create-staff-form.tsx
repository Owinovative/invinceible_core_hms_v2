"use client";

import * as React from "react";
import { Save, UserCog } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateStaff } from "@/hooks/use-create-staff";
import { useFacilities } from "@/hooks/use-facilities";
import { useBranches } from "@/hooks/use-branches";
import { useUsers } from "@/hooks/use-users";
import { useRoles } from "@/hooks/use-roles";
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

const staffSchema = z.object({
  staffCode: z.string().min(1, "Staff code is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  gender: z.string().optional(),
  designation: z.string().optional(),
  facilityId: z.string().min(1, "Facility is required"),
  branchId: z.string().optional(),
  roleId: z.string().min(1, "Role is required"),
  userId: z.string().optional(),
  isClinician: z.string().optional(),
  isPrescriber: z.string().optional(),
  canLogin: z.string().optional(),
});

type StaffFormValues = z.infer<typeof staffSchema>;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "Failed to create staff.";
}

export function CreateStaffForm() {
  const createStaffMutation = useCreateStaff();
  const { data: facilitiesData } = useFacilities();
  const { data: branchesData } = useBranches();
  const { data: usersData } = useUsers();
  const { data: rolesData } = useRoles();

  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [createdCode, setCreatedCode] = React.useState<string | null>(null);

  const facilities = Array.isArray(facilitiesData) ? facilitiesData : [];
  const branches = Array.isArray(branchesData) ? branchesData : [];
  const users = Array.isArray(usersData) ? usersData : [];
  const roles = Array.isArray(rolesData) ? rolesData : [];

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      staffCode: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      gender: "",
      designation: "",
      facilityId: "",
      branchId: "",
      roleId: "",
      userId: "",
      isClinician: "false",
      isPrescriber: "false",
      canLogin: "true",
    },
  });

  const selectedFacilityId = form.watch("facilityId");

  const filteredBranches = React.useMemo(() => {
    if (!selectedFacilityId) return branches;
    return branches.filter(
      (branch) => branch.facilityId === Number(selectedFacilityId),
    );
  }, [branches, selectedFacilityId]);

  React.useEffect(() => {
    const currentBranchId = form.getValues("branchId");
    if (!currentBranchId) return;

    const existsInFiltered = filteredBranches.some(
      (branch) => String(branch.id) === currentBranchId,
    );

    if (!existsInFiltered) {
      form.setValue("branchId", "");
    }
  }, [filteredBranches, form]);

  const onSubmit = async (values: StaffFormValues) => {
    setSuccessMessage(null);
    setCreatedCode(null);

    try {
      const created = await createStaffMutation.mutateAsync({
        staffCode: values.staffCode.trim(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        gender: values.gender || undefined,
        designation: values.designation?.trim() || undefined,
        facilityId: Number(values.facilityId),
        branchId: values.branchId ? Number(values.branchId) : undefined,
        roleId: Number(values.roleId),
        userId: values.userId ? Number(values.userId) : undefined,
        isClinician: values.isClinician === "true",
        isPrescriber: values.isPrescriber === "true",
        canLogin: values.canLogin !== "false",
        isActive: true,
      });

      setSuccessMessage("Staff created successfully.");
      setCreatedCode(created.staffCode);

      form.reset({
        staffCode: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        gender: "",
        designation: "",
        facilityId: "",
        branchId: "",
        roleId: "",
        userId: "",
        isClinician: "false",
        isPrescriber: "false",
        canLogin: "true",
      });
    } catch (error) {
      console.error("Create staff error:", error);
      setSuccessMessage(null);
      setCreatedCode(null);
    }
  };

  return (
    <Card className="rounded-[1.8rem] gradient-border panel-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          New Staff
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-5 md:grid-cols-2"
          >
            <FormField
              control={form.control}
              name="staffCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Code</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11 rounded-xl"
                      placeholder="STF-0001"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div />

            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
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
                    <Input
                      className="h-11 rounded-xl"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Designation</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11 rounded-xl"
                      placeholder="Nurse / Doctor / Cashier"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="facilityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facility</FormLabel>
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
              name="branchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
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
                          {role.name}
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
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Linked User</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Optional user account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.username}
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
              name="isClinician"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinician</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "false"}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPrescriber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prescriber</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "false"}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canLogin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Can Login</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "true"}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 space-y-3 pt-2">
              {createStaffMutation.isError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
                  {getErrorMessage(createStaffMutation.error)}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                  {successMessage}
                  {createdCode ? ` Staff Code: ${createdCode}` : ""}
                </div>
              ) : null}

              <Button
                type="submit"
                className="h-11 rounded-xl px-6"
                disabled={createStaffMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {createStaffMutation.isPending ? "Saving..." : "Create Staff"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
