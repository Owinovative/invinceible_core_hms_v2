"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Loader2,
  PlayCircle,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  StepForward,
} from "lucide-react";

import { getModuleBySlug } from "@/lib/module-catalog";
import { useScope } from "@/providers/scope-provider";
import { useCreateOperationalModuleRecord } from "@/hooks/use-create-operational-module-record";
import { useOperationalModuleRecords } from "@/hooks/use-operational-module-records";
import { useUpdateOperationalModuleRecord } from "@/hooks/use-update-operational-module-record";
import type { OperationalModuleRecord } from "@/services/operational-module-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { appSelectClass } from "@/lib/select-class";

const accentClasses = {
  amber:
    "from-amber-500/18 via-orange-500/8 to-transparent text-warning",
  cyan: "from-pulse/18 via-sky-500/8 to-transparent text-module",
  emerald:
    "from-emerald-500/18 via-teal-500/8 to-transparent text-success",
  rose: "from-rose-500/18 via-red-500/8 to-transparent text-destructive",
  blue:
    "from-pulse/18 via-blue-500/8 to-transparent text-module",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function statusClass(status: string) {
  if (["COMPLETED", "CLOSED"].includes(status)) {
    return "bg-success/10 text-success";
  }

  if (["ESCALATED", "CANCELLED"].includes(status)) {
    return "bg-destructive/10 text-destructive";
  }

  if (status === "WAITING") {
    return "bg-amber-500/10 text-warning";
  }

  return "bg-cyan-500/10 text-module";
}

function priorityClass(priority: string) {
  if (priority === "CRITICAL") {
    return "bg-destructive/10 text-destructive";
  }

  if (priority === "URGENT") {
    return "bg-amber-500/10 text-warning";
  }

  return "bg-muted text-muted-foreground";
}

function escapeCsvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadCsv(fileName: string, rows: unknown[][]) {
  const csvText = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csvText}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}

function getNextStage(workflow: string[], currentStage: string) {
  const currentIndex = workflow.findIndex((step) => step === currentStage);
  if (currentIndex === -1) return workflow[0] ?? currentStage;
  return workflow[currentIndex + 1] ?? currentStage;
}

function toDateTimeInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ModuleWorkspace({ slug }: { slug: string }) {
  const moduleConfig = getModuleBySlug(slug);
  const {
    facilityId,
    selectedBranchId,
    facilityName,
    selectedBranchName,
    availableBranches,
    canSwitchBranches,
    setSelectedBranchId,
  } = useScope();

  const { data, isLoading } = useOperationalModuleRecords(slug);
  const createMutation = useCreateOperationalModuleRecord(slug);
  const updateMutation = useUpdateOperationalModuleRecord(slug);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priorityCode, setPriorityCode] = React.useState("ROUTINE");
  const [dueAt, setDueAt] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [queueFilter, setQueueFilter] = React.useState("active");
  const [queueDensity, setQueueDensity] = React.useState("comfortable");
  const [queueSearch, setQueueSearch] = React.useState("");

  if (!moduleConfig) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        Module not found.
      </div>
    );
  }

  const Icon = moduleConfig.icon;
  const records = data?.records ?? [];
  const summary = data?.summary;
  const visibleRecords = records.filter((record) => {
    if (queueFilter === "all") return true;
    if (queueFilter === "closed") {
      return ["COMPLETED", "CLOSED", "CANCELLED"].includes(record.statusCode);
    }
    return !["COMPLETED", "CLOSED", "CANCELLED"].includes(record.statusCode);
  }).filter((record) => {
    const query = queueSearch.trim().toLowerCase();
    if (!query) return true;

    return [
      record.recordNumber,
      record.title,
      record.description,
      record.workflowStage,
      record.statusCode,
      record.priorityCode,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
  const queueHeightClass =
    queueDensity === "compact" ? "max-h-[520px]" : "max-h-[680px]";
  const recordPaddingClass = queueDensity === "compact" ? "p-3" : "p-4";

  const handleApplyTemplate = (
    template: NonNullable<typeof moduleConfig.quickTemplates>[number],
  ) => {
    setTitle(template.title);
    setDescription(template.description);
    setPriorityCode(template.priorityCode ?? "ROUTINE");

    if (template.dueInHours) {
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + template.dueInHours);
      setDueAt(toDateTimeInputValue(dueDate));
    } else {
      setDueAt("");
    }

    setMessage("Template loaded. Review the details, then save the record.");
  };

  const handleCreate = async () => {
    setMessage(null);

    if (!facilityId) {
      setMessage("A facility is required before module work can be captured.");
      return;
    }

    if (!title.trim()) {
      setMessage("Record title is required.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        moduleTitle: moduleConfig.title,
        title: title.trim(),
        description: description.trim() || undefined,
        workflowStage: moduleConfig.workflow[0] ?? "Intake",
        statusCode: "OPEN",
        priorityCode,
        facilityId,
        branchId: selectedBranchId,
        dueAt: dueAt || undefined,
        metadata: {
          category: moduleConfig.category,
          expectedWorkflow: moduleConfig.workflow,
        },
      });

      setTitle("");
      setDescription("");
      setPriorityCode("ROUTINE");
      setDueAt("");
      setMessage(`${moduleConfig.title} record created.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to create module record.",
      );
    }
  };

  const handleUpdate = async (
    record: OperationalModuleRecord,
    payload: Partial<OperationalModuleRecord>,
  ) => {
    setMessage(null);

    try {
      await updateMutation.mutateAsync({
        recordId: record.id,
        payload: {
          title: payload.title,
          description: payload.description ?? undefined,
          workflowStage: payload.workflowStage,
          statusCode: payload.statusCode,
          priorityCode: payload.priorityCode,
          dueAt: payload.dueAt ?? undefined,
        },
      });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to update module record.",
      );
    }
  };

  const handleDownload = () => {
    downloadCsv(`${moduleConfig.slug}-records.csv`, [
      [
        "recordNumber",
        "title",
        "workflowStage",
        "statusCode",
        "priorityCode",
        "facilityId",
        "branchId",
        "dueAt",
        "updatedAt",
      ],
      ...records.map((record) => [
        record.recordNumber,
        record.title,
        record.workflowStage,
        record.statusCode,
        record.priorityCode,
        record.facilityId,
        record.branchId ?? "",
        record.dueAt ?? "",
        record.updatedAt,
      ]),
    ]);
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.4rem] border surface-spotlight p-6 shadow-md md:p-8">
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${
            accentClasses[moduleConfig.accent]
          }`}
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="mb-4 rounded-full border-0 bg-background/80 px-3 py-1 text-foreground">
              {moduleConfig.category}
            </Badge>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background/80 shadow-sm">
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  {moduleConfig.title}
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {moduleConfig.summary}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={handleDownload}
              disabled={records.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Link href="/reports">
              <Button type="button" className="rounded-xl">
                Reports
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-module">
          {message}
        </div>
      ) : null}

      <section className="grid gap-3 border-y border-border bg-surface-2/70 px-4 py-4 md:grid-cols-4">
        {[
          ["Total", summary?.total ?? 0],
          ["Active", summary?.active ?? 0],
          ["Completed", summary?.completed ?? 0],
          ["Overdue", summary?.overdue ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="border-l-2 border-border-strong px-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-2xl font-black text-module">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-5">
          <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-cyan-500" />
                New Work Record
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Facility</label>
                  <div className="h-12 rounded-xl border bg-background px-3 py-3 text-sm">
                    {facilityName || "No facility"}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Branch</label>
                  {canSwitchBranches ? (
                    <select
                      value={selectedBranchId ? String(selectedBranchId) : ""}
                      onChange={(event) =>
                        setSelectedBranchId(
                          event.target.value
                            ? Number(event.target.value)
                            : undefined,
                        )
                      }
                      className={appSelectClass}
                    >
                      <option value="">All branches</option>
                      {availableBranches.map((branch) => (
                        <option key={branch.id} value={String(branch.id)}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="h-12 rounded-xl border bg-background px-3 py-3 text-sm">
                      {selectedBranchName || "No branch"}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Title</label>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-12 rounded-xl"
                  placeholder={`${moduleConfig.title} work item`}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Priority</label>
                  <select
                    value={priorityCode}
                    onChange={(event) => setPriorityCode(event.target.value)}
                    className={appSelectClass}
                  >
                    <option value="ROUTINE">Routine</option>
                    <option value="URGENT">Urgent</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Due Date</label>
                  <Input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(event) => setDueAt(event.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Notes</label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-28 rounded-xl"
                />
              </div>

              <Button
                type="button"
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="h-12 w-full rounded-xl"
              >
                {createMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Record
              </Button>
            </CardContent>
          </Card>

          {moduleConfig.quickTemplates?.length ? (
            <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-cyan-500" />
                  Quick Starters
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {moduleConfig.quickTemplates.map((template) => (
                  <button
                    key={template.title}
                    type="button"
                    onClick={() => handleApplyTemplate(template)}
                    className="rounded-xl border border-border bg-background/75 p-4 text-left transition hover:border-border-strong hover:bg-surface-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{template.title}</p>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                          {template.description}
                        </p>
                      </div>
                      <Badge className={`shrink-0 border-0 ${priorityClass(template.priorityCode ?? "ROUTINE")}`}>
                        {template.priorityCode ?? "ROUTINE"}
                      </Badge>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {moduleConfig.controls.map((control) => (
                <div
                  key={control}
                  className="flex items-center gap-3 rounded-xl border bg-background/65 p-3"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm">{control}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
            <CardHeader>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>Live Work Queue</CardTitle>
                  <Sparkles className="h-5 w-5 text-cyan-500" />
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_150px_150px]">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Search
                    </label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={queueSearch}
                        onChange={(event) =>
                          setQueueSearch(event.target.value)
                        }
                        className="h-12 rounded-xl pl-10"
                        placeholder="Record, stage, status"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Queue view
                    </label>
                    <select
                      value={queueFilter}
                      onChange={(event) => setQueueFilter(event.target.value)}
                      className={appSelectClass}
                    >
                      <option value="active">Active work</option>
                      <option value="closed">Closed work</option>
                      <option value="all">All records</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Density
                    </label>
                    <select
                      value={queueDensity}
                      onChange={(event) => setQueueDensity(event.target.value)}
                      className={appSelectClass}
                    >
                      <option value="comfortable">Comfortable</option>
                      <option value="compact">Compact</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="flex items-center gap-2 rounded-xl border bg-background/65 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading module records...
                </div>
              ) : visibleRecords.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-background/65 p-4 text-sm text-muted-foreground">
                  No records match this queue view.
                </div>
              ) : (
                <div className={`${queueHeightClass} space-y-3 overflow-auto pr-1`}>
                  {visibleRecords.map((record) => {
                  const nextStage = getNextStage(
                    moduleConfig.workflow,
                    record.workflowStage,
                  );
                  const canAdvance =
                    !["COMPLETED", "CLOSED", "CANCELLED"].includes(
                      record.statusCode,
                    ) && nextStage !== record.workflowStage;

                  return (
                    <div
                      key={record.id}
                      className={`rounded-xl border bg-background/65 ${recordPaddingClass}`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="rounded-full">
                              {record.recordNumber}
                            </Badge>
                            <Badge
                              className={`rounded-full border-0 ${statusClass(
                                record.statusCode,
                              )}`}
                            >
                              {record.statusCode}
                            </Badge>
                            <Badge
                              className={`rounded-full border-0 ${priorityClass(
                                record.priorityCode,
                              )}`}
                            >
                              {record.priorityCode}
                            </Badge>
                          </div>
                          <p className="mt-3 font-semibold">{record.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Stage: {record.workflowStage}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Due: {formatDate(record.dueAt)} / Updated:{" "}
                            {formatDate(record.updatedAt)}
                          </p>
                          {record.description ? (
                            <p className="mt-2 text-sm text-muted-foreground">
                              {record.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {record.statusCode === "OPEN" ? (
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-xl"
                              disabled={updateMutation.isPending}
                              onClick={() =>
                                handleUpdate(record, {
                                  statusCode: "IN_PROGRESS",
                                })
                              }
                            >
                              <PlayCircle className="mr-2 h-4 w-4" />
                              Start
                            </Button>
                          ) : null}
                          {canAdvance ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              disabled={updateMutation.isPending}
                              onClick={() =>
                                handleUpdate(record, {
                                  workflowStage: nextStage,
                                  statusCode: "IN_PROGRESS",
                                })
                              }
                            >
                              <StepForward className="mr-2 h-4 w-4" />
                              Next
                            </Button>
                          ) : null}
                          {!["COMPLETED", "CLOSED", "CANCELLED"].includes(
                            record.statusCode,
                          ) ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              disabled={updateMutation.isPending}
                              onClick={() =>
                                handleUpdate(record, {
                                  workflowStage:
                                    moduleConfig.workflow[moduleConfig.workflow.length - 1] ??
                                    record.workflowStage,
                                  statusCode: "COMPLETED",
                                })
                              }
                            >
                              Complete
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {moduleConfig.records.map((record) => (
              <div
                key={record}
                className="rounded-[1.1rem] border bg-card/90 p-5 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Record
                </p>
                <p className="mt-2 font-semibold">{record}</p>
              </div>
            ))}
          </section>
        </div>
      </section>
    </div>
  );
}
