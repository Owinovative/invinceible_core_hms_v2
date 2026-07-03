"use client";


import * as React from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  FileUp,
  FlaskConical,
  Paperclip,
  Loader2,
  TestTube2,
} from "lucide-react";
import { useLabQueue } from "@/hooks/use-lab-queue";
import { useLabResults } from "@/hooks/use-lab-results";
import { useCreateLabResult } from "@/hooks/use-create-lab-result";
import { useScope } from "@/providers/scope-provider";
import { useAuth } from "@/providers/auth-provider";
import type { LabOrderRecord, LabOrderItem } from "@/services/lab-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";


function patientName(order: LabOrderRecord) {
  const p = order.patient;
  if (!p) return "Unknown patient";
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
}


function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}


function urgencyTone(urgency?: string | null) {
  switch ((urgency || "ROUTINE").toUpperCase()) {
    case "STAT":
      return "bg-red-500/10 text-red-300 border-red-500/20";
    case "URGENT":
      return "bg-amber-500/10 text-amber-300 border-amber-500/20";
    default:
      return "bg-cyan-500/10 text-cyan-300 border-cyan-500/20";
  }
}


function orderProgress(items: LabOrderItem[] = []) {
  if (items.length === 0) return { done: 0, total: 0 };
  const done = items.filter((item) => item.status === "RESULTED").length;
  return { done, total: items.length };
}

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

async function readCompactResultAttachment(file: File) {
  if (file.type.startsWith("image/")) {
    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(dataUrl);
    const maxSide = 1400;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare image attachment.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return {
      attachmentFileName: file.name.replace(/\.[^.]+$/, ".jpg"),
      attachmentMimeType: "image/jpeg",
      attachmentDataUrl: canvas.toDataURL("image/jpeg", 0.78),
    };
  }

  if (file.type === "application/pdf") {
    if (file.size > 3 * 1024 * 1024) {
      throw new Error("PDF result must be 3MB or smaller.");
    }

    return {
      attachmentFileName: file.name,
      attachmentMimeType: file.type,
      attachmentDataUrl: await readFileAsDataUrl(file),
    };
  }

  throw new Error("Upload a PDF or image result file.");
}


export default function LabPage() {
  const { facilityName, selectedBranchName } = useScope();
  const { user } = useAuth();
  const { data, isLoading } = useLabQueue();
  const createLabResultMutation = useCreateLabResult();


  const queue = Array.isArray(data) ? data : [];
  const [selectedOrderId, setSelectedOrderId] = React.useState<number | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);


  const selectedOrder = React.useMemo(
    () => queue.find((item) => item.id === selectedOrderId) ?? queue[0] ?? null,
    [queue, selectedOrderId],
  );


  const { data: resultsData } = useLabResults(selectedOrder?.id);
  const results = Array.isArray(resultsData) ? resultsData : [];


  React.useEffect(() => {
    if (queue.length === 0) {
      setSelectedOrderId(null);
      return;
    }

    if (!selectedOrderId) {
      setSelectedOrderId(queue[0].id);
      return;
    }

    const stillExists = queue.some((item) => item.id === selectedOrderId);
    if (!stillExists) {
      setSelectedOrderId(queue[0].id);
    }
  }, [queue, selectedOrderId]);


  const [activeItemId, setActiveItemId] = React.useState<number | null>(null);
  const [resultValue, setResultValue] = React.useState("");
  const [remarks, setRemarks] = React.useState("");
  const [attachment, setAttachment] = React.useState<{
    attachmentFileName: string;
    attachmentMimeType: string;
    attachmentDataUrl: string;
  } | null>(null);
  const [attachmentBusy, setAttachmentBusy] = React.useState(false);


  React.useEffect(() => {
    if (!selectedOrder?.items?.length) {
      setActiveItemId(null);
      return;
    }


    const firstPending =
      selectedOrder.items.find((item) => item.status !== "RESULTED") ??
      selectedOrder.items[0];


    setActiveItemId(firstPending?.id ?? null);
    setResultValue("");
    setRemarks("");
    setAttachment(null);
  }, [selectedOrder?.id, selectedOrder?.items]);


  const activeItem =
    selectedOrder?.items?.find((item) => item.id === activeItemId) ?? null;

  const handleAttachmentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setAttachmentBusy(true);
      setMessage(null);
      setAttachment(await readCompactResultAttachment(file));
    } catch (error) {
      setAttachment(null);
      setMessage(
        error instanceof Error ? error.message : "Unable to prepare attachment.",
      );
    } finally {
      setAttachmentBusy(false);
      event.target.value = "";
    }
  };


  const handleSaveResult = async () => {
    if (!activeItem) return;

    if (!resultValue.trim()) {
      setMessage("Please enter a result value.");
      return;
    }

    setMessage(null);

    await createLabResultMutation.mutateAsync({
      orderItemId: activeItem.id,
      resultValue: resultValue.trim(),
      remarks: remarks.trim() || undefined,
      attachmentFileName: attachment?.attachmentFileName,
      attachmentMimeType: attachment?.attachmentMimeType,
      attachmentDataUrl: attachment?.attachmentDataUrl,
      recordedBy: user?.staffId ? Number(user.staffId) : undefined,
    });

    const nextPending =
      selectedOrder?.items?.find(
        (item) => item.id !== activeItem.id && item.status !== "RESULTED",
      ) ?? null;

    setResultValue("");
    setRemarks("");
    setAttachment(null);
    setActiveItemId(nextPending?.id ?? activeItem.id);
    setMessage("Lab result recorded successfully.");
  };


  const totalOrders = queue.length;
  const totalPendingItems = queue.reduce((sum, order) => {
    const items = order.items ?? [];
    return sum + items.filter((item) => item.status !== "RESULTED").length;
  }, 0);


  const inProgressOrders = queue.filter(
    (order) => (order.status || "").toUpperCase() === "IN_PROGRESS",
  ).length;


  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border surface-spotlight shadow-md p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-600/10 via-blue-500/5 to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />


        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full border-0 bg-cyan-600/10 px-3 py-1 text-module">
              Laboratory Workspace
            </Badge>


            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
                <FlaskConical className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Lab Queue
                </h1>
                <p className="text-muted-foreground">
                  Review ordered tests, enter results, and process pending lab work
                </p>
              </div>
            </div>
          </div>


          <div className="grid gap-3 sm:grid-cols-3 xl:w-[560px]">
            <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Facility
              </p>
              <p className="mt-2 text-sm font-semibold">{facilityName || "No facility"}</p>
            </div>


            <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Branch
              </p>
              <p className="mt-2 text-sm font-semibold">{selectedBranchName || "No branch"}</p>
            </div>


            <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Queue Orders
              </p>
              <p className="mt-2 text-sm font-semibold">{totalOrders}</p>
            </div>
          </div>
        </div>
      </section>


      {message ? (
        <div className="rounded-[1.4rem] border border-cyan-500/20 bg-cyan-500/8 px-4 py-4 text-sm text-cyan-300">
          {message}
        </div>
      ) : null}


      <section className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Queued Orders</p>
              <p className="mt-2 text-2xl font-bold">{totalOrders}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <ClipboardCheck className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>


        <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Pending Items</p>
              <p className="mt-2 text-2xl font-bold">{totalPendingItems}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <TestTube2 className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>


        <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="mt-2 text-2xl font-bold">{inProgressOrders}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <FlaskConical className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
      </section>


      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
          <CardHeader>
            <CardTitle>Lab Work Queue</CardTitle>
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
            ) : queue.length === 0 ? (
              <div className="rounded-[1.3rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                No lab orders are currently waiting in queue.
              </div>
            ) : (
              queue.map((order) => {
                const active = selectedOrder?.id === order.id;
                const progress = orderProgress(order.items ?? []);


                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={cn(
                      "w-full rounded-[1.3rem] border p-4 text-left transition-all",
                      active
                        ? "border-cyan-400/40 bg-cyan-500/10"
                        : "border-white/10 bg-card/[0.03] hover:bg-card/[0.05]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{order.orderNumber}</p>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                              urgencyTone(order.urgency),
                            )}
                          >
                            {order.urgency || "ROUTINE"}
                          </span>
                        </div>


                        <p className="mt-1 text-sm text-muted-foreground">
                          {patientName(order)}
                        </p>


                        <p className="mt-2 text-sm text-muted-foreground">
                          {progress.done}/{progress.total} tests resulted
                        </p>


                        <p className="mt-2 text-xs text-cyan-300">
                          Created: {formatDate(order.createdAt)}
                        </p>
                      </div>


                      {active ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-400" />
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>


        <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
          <CardHeader>
            <CardTitle>Result Entry</CardTitle>
          </CardHeader>


          <CardContent className="space-y-5">
            {!selectedOrder ? (
              <div className="rounded-[1.3rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                Select an order from the queue.
              </div>
            ) : (
              <>
                <div className="rounded-[1.3rem] border border-white/10 bg-card/[0.03] p-4">
                  <p className="text-lg font-bold">{patientName(selectedOrder)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedOrder.patient?.patientNumber || "No patient number"}
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                      <p className="text-xs text-muted-foreground">Order Number</p>
                      <p className="mt-1 text-sm font-medium">{selectedOrder.orderNumber}</p>
                    </div>
                    <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                      <p className="text-xs text-muted-foreground">Urgency</p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedOrder.urgency || "ROUTINE"}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3 md:col-span-2">
                      <p className="text-xs text-muted-foreground">Clinical Notes</p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedOrder.clinicalNotes || "—"}
                      </p>
                    </div>
                  </div>
                </div>


                <div className="space-y-3">
                  <p className="text-sm font-medium">Order Items</p>


                  {(selectedOrder.items ?? []).map((item) => {
                    const isActive = item.id === activeItemId;
                    const latestResult =
                      results.find((result) => result.orderItemId === item.id) ??
                      item.results?.[0];


                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveItemId(item.id)}
                        className={cn(
                          "w-full rounded-[1.2rem] border p-4 text-left transition-all",
                          isActive
                            ? "border-cyan-400/40 bg-cyan-500/10"
                            : "border-white/10 bg-card/[0.03] hover:bg-card/[0.05]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">
                              {item.test?.testName || `Test #${item.testId}`}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.instructions || "No instruction"}
                            </p>
                            <p className="mt-2 text-xs text-cyan-300">
                              Status: {item.status}
                            </p>
                            {latestResult ? (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-emerald-300">
                                  Latest Result: {latestResult.resultValue}
                                </p>
                                {latestResult.attachmentDataUrl ? (
                                  <a
                                    href={latestResult.attachmentDataUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 underline underline-offset-4"
                                  >
                                    <Paperclip className="h-3 w-3" />
                                    View attached result
                                  </a>
                                ) : null}
                              </div>
                            ) : null}
                          </div>


                          {item.status === "RESULTED" ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {!activeItem ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-4 text-sm text-muted-foreground">
                    Select an order item to record its result.
                  </div>
                ) : activeItem.status === "RESULTED" ? (
                  <div className="space-y-4 rounded-[1.3rem] border border-emerald-500/20 bg-success/10 p-4">
                    <div>
                      <p className="text-sm font-semibold">
                        {activeItem.test?.testName || `Test #${activeItem.testId}`}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {activeItem.instructions || "No instruction"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Recorded Result</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
                        {(
                          results.find((result) => result.orderItemId === activeItem.id) ??
                          activeItem.results?.[0]
                        )?.resultValue || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Remarks</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
                        {(
                          results.find((result) => result.orderItemId === activeItem.id) ??
                          activeItem.results?.[0]
                        )?.remarks || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Recorded At</p>
                      <p className="mt-1 text-sm font-medium">
                        {formatDate(
                          (
                            results.find((result) => result.orderItemId === activeItem.id) ??
                            activeItem.results?.[0]
                          )?.recordedAt,
                        )}
                      </p>
                    </div>

                    {(
                      results.find((result) => result.orderItemId === activeItem.id) ??
                      activeItem.results?.[0]
                    )?.attachmentDataUrl ? (
                      <a
                        href={
                          (
                            results.find(
                              (result) => result.orderItemId === activeItem.id,
                            ) ?? activeItem.results?.[0]
                          )?.attachmentDataUrl || "#"
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 underline underline-offset-4"
                      >
                        <Paperclip className="h-4 w-4" />
                        Open uploaded result file
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-4 rounded-[1.3rem] border border-white/10 bg-card/[0.03] p-4">
                    <div>
                      <p className="text-sm font-semibold">
                        {activeItem.test?.testName || `Test #${activeItem.testId}`}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {activeItem.instructions || "No instruction"}
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Result Value</label>
                      <Textarea
                        value={resultValue}
                        onChange={(e) => setResultValue(e.target.value)}
                        className="min-h-[120px] rounded-2xl"
                        placeholder="Enter lab result"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Remarks</label>
                      <Textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="min-h-[100px] rounded-2xl"
                        placeholder="Additional remarks"
                      />
                    </div>

                    <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                      <label className="mb-2 block text-sm font-medium">
                        Result Attachment
                      </label>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={handleAttachmentUpload}
                        className="block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-cyan-700"
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <FileUp className="h-4 w-4" />
                        Images are compressed before saving. PDFs are accepted up to 3MB.
                      </div>
                      {attachmentBusy ? (
                        <p className="mt-2 text-xs text-cyan-300">
                          Preparing compact file...
                        </p>
                      ) : attachment ? (
                        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-sm">
                          <span className="truncate">
                            {attachment.attachmentFileName}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="rounded-xl"
                            onClick={() => setAttachment(null)}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    <Button
                      type="button"
                      className="h-12 rounded-2xl"
                      onClick={handleSaveResult}
                      disabled={createLabResultMutation.isPending}
                    >
                      {createLabResultMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FlaskConical className="mr-2 h-4 w-4" />
                      )}
                      Save Result
                    </Button>
                  </div>
                )}

              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
