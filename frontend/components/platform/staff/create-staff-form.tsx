"use client";

import * as React from "react";
import { Bot, Camera, Save, UserCog } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useReadIdentityCard } from "@/hooks/use-ai-assistant";
import { useCreateStaff } from "@/hooks/use-create-staff";
import { useFacilities } from "@/hooks/use-facilities";
import { useBranches } from "@/hooks/use-branches";
import { useUsers } from "@/hooks/use-users";
import { useRoles } from "@/hooks/use-roles";
import type { IdentityOcrResponse } from "@/services/ai-assistant-service";
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
  nationalIdNumber: z.string().min(1, "National ID number is required"),
  nationalIdImageUrl: z.string().optional(),
  passportPhotoUrl: z.string().optional(),
  clinicianRegistrationNumber: z.string().optional(),
  clinicianBoard: z.string().optional(),
  facilityId: z.string().min(1, "Facility is required"),
  branchId: z.string().optional(),
  roleId: z.string().min(1, "Role is required"),
  userId: z.string().optional(),
  isClinician: z.string().optional(),
  isPrescriber: z.string().optional(),
  canLogin: z.string().optional(),
});

type StaffFormValues = z.infer<typeof staffSchema>;

const clinicianBoards = [
  "Kenya Medical Practitioners and Dentists Council",
  "Clinical Officers Council",
  "Nursing Council of Kenya",
  "Pharmacy and Poisons Board",
  "Kenya Medical Laboratory Technicians and Technologists Board",
  "Radiation Protection Board",
  "Physiotherapy Council of Kenya",
  "Kenya Nutritionists and Dieticians Institute",
  "Public Health Officers and Technicians Council",
];

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

async function compactImageDataUrl(file: File, maxSide = 1200) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare image.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

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
  const readIdentityMutation = useReadIdentityCard();
  const { data: facilitiesData } = useFacilities();
  const { data: branchesData } = useBranches();
  const { data: usersData } = useUsers();
  const { data: rolesData } = useRoles();

  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [createdCode, setCreatedCode] = React.useState<string | null>(null);
  const [ocrMessage, setOcrMessage] = React.useState<string | null>(null);

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
      nationalIdNumber: "",
      nationalIdImageUrl: "",
      passportPhotoUrl: "",
      clinicianRegistrationNumber: "",
      clinicianBoard: "",
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
  const isClinician = form.watch("isClinician") === "true";
  const nationalIdImageUrl = form.watch("nationalIdImageUrl");
  const passportPhotoUrl = form.watch("passportPhotoUrl");

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
        nationalIdNumber: values.nationalIdNumber.trim(),
        nationalIdImageUrl: values.nationalIdImageUrl || undefined,
        passportPhotoUrl: values.passportPhotoUrl || undefined,
        clinicianRegistrationNumber:
          values.clinicianRegistrationNumber?.trim() || undefined,
        clinicianBoard: values.clinicianBoard || undefined,
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
        nationalIdNumber: "",
        nationalIdImageUrl: "",
        passportPhotoUrl: "",
        clinicianRegistrationNumber: "",
        clinicianBoard: "",
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

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: "nationalIdImageUrl" | "passportPhotoUrl",
    maxSide: number,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setOcrMessage(null);
      const value = await compactImageDataUrl(file, maxSide);
      form.setValue(field, value, { shouldDirty: true, shouldValidate: true });
      if (field === "nationalIdImageUrl") {
        void runIdentityRead(value).catch((error) => {
          setOcrMessage(
            error instanceof Error ? error.message : "Unable to read ID image.",
          );
        });
      }
    } catch (error) {
      setOcrMessage(
        error instanceof Error ? error.message : "Unable to upload image.",
      );
    } finally {
      event.target.value = "";
    }
  };

  const applyIdentityResult = (result: IdentityOcrResponse) => {
    if (result.nationalIdNumber) {
      form.setValue("nationalIdNumber", result.nationalIdNumber, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    const firstName = result.firstName?.trim();
    const surname = [result.middleName, result.lastName]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(" ");

    if (firstName) {
      form.setValue("firstName", firstName, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    if (surname) {
      form.setValue("lastName", surname, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    if (result.fullName) {
      const parts = result.fullName.split(/\s+/).filter(Boolean);
      if (parts.length > 0) {
        form.setValue("firstName", parts[0], {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
      if (parts.length > 1) {
        form.setValue("lastName", parts.slice(1).join(" "), {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    }
  };

  const runIdentityRead = async (imageDataUrl: string) => {
    setOcrMessage("Reading national ID with AI...");
    const result = await readIdentityMutation.mutateAsync(imageDataUrl);
    applyIdentityResult(result);
    setOcrMessage(
      `AI reading complete. Confidence ${Math.round(
        (result.confidence || 0) * 100,
      )}%. Please verify before saving.`,
    );
  };

  const handleReadIdentity = async () => {
    setOcrMessage(null);

    if (!nationalIdImageUrl) {
      setOcrMessage("Upload the national ID image before running AI reading.");
      return;
    }

    try {
      await runIdentityRead(nationalIdImageUrl);
    } catch (error) {
      setOcrMessage(
        error instanceof Error ? error.message : "Unable to read ID image.",
      );
    }
  };

  return (
    <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-module" />
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
              name="nationalIdNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>National ID Number</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11 rounded-xl"
                      placeholder="Mandatory"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-xl border bg-background/65 p-4 md:col-span-2">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">National ID image</p>
                  <p className="text-sm text-muted-foreground">
                    Upload the ID card, then let AI read the visible name and ID
                    number. The fields remain editable.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={handleReadIdentity}
                  disabled={
                    readIdentityMutation.isPending || !nationalIdImageUrl
                  }
                >
                  <Bot className="mr-2 h-4 w-4" />
                  {readIdentityMutation.isPending ? "Reading..." : "AI read ID"}
                </Button>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <Input
                  type="file"
                  accept="image/*"
                  className="h-11 rounded-xl"
                  onChange={(event) =>
                    handleImageUpload(event, "nationalIdImageUrl", 1600)
                  }
                />
                {nationalIdImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={nationalIdImageUrl}
                    alt=""
                    className="h-20 w-32 rounded-lg border object-cover"
                  />
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border bg-background/65 p-4 md:col-span-2">
              <div className="flex items-center gap-3">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border bg-surface-2">
                  {passportPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={passportPhotoUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Camera className="h-7 w-7 text-module" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Passport photo</p>
                  <Input
                    type="file"
                    accept="image/*"
                    className="mt-2 h-11 rounded-xl"
                    onChange={(event) =>
                      handleImageUpload(event, "passportPhotoUrl", 900)
                    }
                  />
                </div>
              </div>
            </div>

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

            {isClinician ? (
              <>
                <FormField
                  control={form.control}
                  name="clinicianRegistrationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number</FormLabel>
                      <FormControl>
                        <Input
                          className="h-11 rounded-xl"
                          placeholder="Board registration number"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clinicianBoard"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Board</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="Select board" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clinicianBoards.map((board) => (
                            <SelectItem key={board} value={board}>
                              {board}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : null}

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
                <div className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  {getErrorMessage(createStaffMutation.error)}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">
                  {successMessage}
                  {createdCode ? ` Staff Code: ${createdCode}` : ""}
                </div>
              ) : null}

              {ocrMessage ? (
                <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-module">
                  {ocrMessage}
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
