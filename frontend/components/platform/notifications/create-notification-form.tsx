"use client";

import * as React from "react";
import { BellRing, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateNotification } from "@/hooks/use-create-notification";
import { useFacilities } from "@/hooks/use-facilities";
import { useBranches } from "@/hooks/use-branches";
import { useUsers } from "@/hooks/use-users";
import { useStaff } from "@/hooks/use-staff";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const notificationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  notificationType: z.string().optional(),
  severity: z.string().optional(),
  moduleName: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  facilityId: z.string().optional(),
  branchId: z.string().optional(),
  targetUserId: z.string().optional(),
  targetStaffId: z.string().optional(),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Failed to send notification.";
}

export function CreateNotificationForm() {
  const createNotificationMutation = useCreateNotification();
  const { data: facilitiesData } = useFacilities();
  const { data: branchesData } = useBranches();
  const { data: usersData } = useUsers();
  const { data: staffData } = useStaff();

  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const facilities = Array.isArray(facilitiesData) ? facilitiesData : [];
  const branches = Array.isArray(branchesData) ? branchesData : [];
  const users = Array.isArray(usersData) ? usersData : [];
  const staff = Array.isArray(staffData) ? staffData : [];

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: "",
      message: "",
      notificationType: "",
      severity: "INFO",
      moduleName: "",
      entityType: "",
      entityId: "",
      facilityId: "",
      branchId: "",
      targetUserId: "",
      targetStaffId: "",
    },
  });

  const selectedFacilityId = form.watch("facilityId");

  const filteredBranches = React.useMemo(() => {
    if (!selectedFacilityId) return branches;
    return branches.filter(
      (branch) => branch.facilityId === Number(selectedFacilityId),
    );
  }, [branches, selectedFacilityId]);

  const onSubmit = async (values: NotificationFormValues) => {
    setSuccessMessage(null);

    try {
      await createNotificationMutation.mutateAsync({
        title: values.title.trim(),
        message: values.message.trim(),
        notificationType: values.notificationType || undefined,
        severity: values.severity || undefined,
        moduleName: values.moduleName || undefined,
        entityType: values.entityType || undefined,
        entityId: values.entityId || undefined,
        facilityId: values.facilityId ? Number(values.facilityId) : undefined,
        branchId: values.branchId ? Number(values.branchId) : undefined,
        targetUserId: values.targetUserId ? Number(values.targetUserId) : undefined,
        targetStaffId: values.targetStaffId ? Number(values.targetStaffId) : undefined,
      });

      setSuccessMessage("Notification sent successfully.");

      form.reset({
        title: "",
        message: "",
        notificationType: "",
        severity: "INFO",
        moduleName: "",
        entityType: "",
        entityId: "",
        facilityId: "",
        branchId: "",
        targetUserId: "",
        targetStaffId: "",
      });
    } catch (error) {
      console.error("Create notification error:", error);
      setSuccessMessage(null);
    }
  };

  return (
    <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-module" />
          Send Notification
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="Important update" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[120px] rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Severity</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "INFO"}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="INFO">Info</SelectItem>
                      <SelectItem value="WARNING">Warning</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notificationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notification Type</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="GENERAL / LOW_STOCK / ALERT" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="moduleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Module</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="PHARMACY / BILLING / PLATFORM" {...field} />
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
                        <SelectValue placeholder="Optional facility" />
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
                        <SelectValue placeholder="Optional branch" />
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
              name="targetUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target User</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Optional target user" />
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
              name="targetStaffId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Staff</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Optional target staff" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staff.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.firstName} {item.lastName}
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
              name="entityType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity Type</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="Optional entity type" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="entityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity ID</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="Optional entity id" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 space-y-3 pt-2">
              {createNotificationMutation.isError ? (
                <div className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  {getErrorMessage(createNotificationMutation.error)}
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
                disabled={createNotificationMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {createNotificationMutation.isPending ? "Sending..." : "Send Notification"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
