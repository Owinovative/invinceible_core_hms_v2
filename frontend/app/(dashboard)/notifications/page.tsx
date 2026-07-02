"use client";

import * as React from "react";
import { Bell, CheckCircle2, CircleAlert, RadioTower } from "lucide-react";
import { useCreateNotification } from "@/hooks/use-create-notification";
import { useNotificationRecipients } from "@/hooks/use-notification-recipients";
import { useNotifications } from "@/hooks/use-notifications";
import { useNotificationStats } from "@/hooks/use-notification-stats";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { appSelectClass } from "@/lib/select-class";
import { useAuth } from "@/providers/auth-provider";
import { useScope } from "@/providers/scope-provider";

export default function NotificationsPage() {
  const { user } = useAuth();
  const { facilityId, facilityName, selectedBranchId, selectedBranchName } =
    useScope();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const pageSize = 25;
  const deferredSearch = React.useDeferredValue(search);
  const scope = { facilityId, branchId: selectedBranchId };
  const { data, isLoading, isFetching } = useNotifications({
    ...scope,
    page,
    pageSize,
    search: deferredSearch,
  });
  const { data: stats } = useNotificationStats(scope);
  const { data: recipients } = useNotificationRecipients();
  const createNotificationMutation = useCreateNotification();
  const [recipient, setRecipient] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);

  const notifications = data?.data ?? [];
  const notificationMeta = data?.meta;
  const roleCode = user?.roleCode ?? "";
  const isSuperAdmin = roleCode === "SUPER_ADMIN";
  const isFacilityAdmin = ["ADMIN", "FACILITY_ADMIN"].includes(roleCode);

  React.useEffect(() => {
    setPage(1);
  }, [deferredSearch, facilityId, selectedBranchId]);

  const recipientOptions = React.useMemo(() => {
    const rows: Array<{ value: string; label: string }> = [];
    if (recipients?.canNotifySystem || isSuperAdmin) {
      rows.push({ value: "system", label: "Everyone in the system" });
    }
    if ((recipients?.canNotifyFacility || isFacilityAdmin) && facilityId) {
      rows.push({ value: "facility", label: "Everyone in this facility" });
    }

    (recipients?.users || []).forEach((item) => {
      const targetRole = item.roleCode ?? "";
      rows.push({
        value: `user:${item.id}`,
        label: `${item.fullName || item.username} (${targetRole || "USER"})`,
      });
    });

    (recipients?.staff || []).forEach((item) => {
      rows.push({
        value: `staff:${item.id}`,
        label: `${item.firstName} ${item.lastName} (${item.designation || item.staffCode})`,
      });
    });

    return rows;
  }, [facilityId, isFacilityAdmin, isSuperAdmin, recipients]);

  const sendNotification = async () => {
    setNotice(null);
    const payload: {
      title: string;
      message: string;
      notificationType: string;
      severity: string;
      moduleName: string;
      facilityId?: number;
      branchId?: number;
      targetUserId?: number;
      targetStaffId?: number;
    } = {
      title,
      message,
      notificationType: "USER_MESSAGE",
      severity: "INFO",
      moduleName: "MESSAGING",
    };

    if (recipient === "facility" && facilityId) {
      payload.facilityId = facilityId;
    } else if (recipient.startsWith("user:")) {
      payload.targetUserId = Number(recipient.split(":")[1]);
    } else if (recipient.startsWith("staff:")) {
      payload.targetStaffId = Number(recipient.split(":")[1]);
    } else if (recipient !== "system") {
      setNotice("Choose a recipient first.");
      return;
    }

    await createNotificationMutation.mutateAsync(payload);
    setTitle("");
    setMessage("");
    setRecipient("");
    setNotice("Notification sent.");
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-card/[0.03] p-6 shadow-md md:p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-pulse/0 via-cyan-400/70 to-cyan-400/0" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full border-0 bg-primary/10 px-3 py-1 text-module">
              Live alerts
            </Badge>

            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Bell className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Notifications
                </h1>
              </div>
            </div>
          </div>

          <div className="grid w-full max-w-xl grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Facility</p>
              <p className="truncate font-semibold">
                {facilityName || "No facility"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Branch</p>
              <p className="truncate font-semibold">
                {selectedBranchName || "No branch"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unread</p>
              <p className="flex items-center gap-1 font-semibold">
                <CircleAlert className="h-4 w-4 text-amber-400" />
                {stats?.unread ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Open</p>
              <p className="flex items-center gap-1 font-semibold">
                <RadioTower className="h-4 w-4 text-cyan-400" />
                {stats?.unresolved ?? 0}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border border-border bg-card p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr_auto] xl:items-end">
          <div>
            <label className="mb-2 block text-sm font-medium">Recipient</label>
            <select
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              className={appSelectClass}
            >
              <option value="">Choose recipient</option>
              {recipientOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-[0.55fr_1fr]">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-11 rounded-md"
              placeholder="Title"
            />
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-[44px] rounded-md"
              placeholder="Message"
            />
          </div>
          <Button
            className="h-11 rounded-md bg-primary text-white hover:bg-brand-strong"
            disabled={
              createNotificationMutation.isPending ||
              !recipient ||
              title.trim().length < 3 ||
              message.trim().length < 3
            }
            onClick={sendNotification}
          >
            Send
          </Button>
        </div>
        {notice ? <p className="mt-3 text-sm text-module">{notice}</p> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.25rem] border border-white/10 bg-card/[0.03] p-4 shadow-md">
          <p className="text-sm text-muted-foreground">Critical</p>
          <p className="mt-2 text-3xl font-bold">{stats?.severity.critical ?? 0}</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/10 bg-card/[0.03] p-4 shadow-md">
          <p className="text-sm text-muted-foreground">Warnings</p>
          <p className="mt-2 text-3xl font-bold">{stats?.severity.warning ?? 0}</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/10 bg-card/[0.03] p-4 shadow-md">
          <p className="text-sm text-muted-foreground">Resolved</p>
          <p className="mt-2 flex items-center gap-2 text-3xl font-bold">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            {stats?.resolved ?? 0}
          </p>
        </div>
      </section>

      <section className="border border-border bg-card p-4 shadow-sm">
        <label className="mb-2 block text-sm font-medium">
          Search notifications
        </label>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-11 rounded-md"
          placeholder="Search title, message, module, entity, or type"
        />
      </section>

      <NotificationsList items={notifications} isLoading={isLoading} scope={scope} />

      <div className="flex flex-col gap-3 border border-border bg-card p-4 text-sm shadow-sm md:flex-row md:items-center md:justify-between">
        <span className="text-muted-foreground">
          Showing page {notificationMeta?.page ?? page} of{" "}
          {notificationMeta?.totalPages ?? 1}.{" "}
          {isFetching && !isLoading ? "Refreshing..." : `${notificationMeta?.total ?? notifications.length} total alerts`}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-md"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            className="rounded-md"
            disabled={!notificationMeta?.hasNextPage || isFetching}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
