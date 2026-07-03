"use client";

import * as React from "react";
import {
  Bot,
  Clipboard,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  clinicalAiTaskOptions,
  type ClinicalAiTask,
} from "@/services/ai-assistant-service";
import {
  useAiAssistantStatus,
  useCreateClinicalAiDraft,
} from "@/hooks/use-ai-assistant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ClinicalAiAssistantProps = {
  title?: string;
  subtitle?: string;
  context?: Record<string, unknown>;
  defaultPrompt?: string;
  defaultTask?: ClinicalAiTask;
  compact?: boolean;
};

export function ClinicalAiAssistant({
  title = "Clinical AI Assistant",
  subtitle = "Draft notes, patient instructions, summaries, and clean clinical text for staff review.",
  context,
  defaultPrompt = "",
  defaultTask = "SOAP_NOTE",
  compact = false,
}: ClinicalAiAssistantProps) {
  const status = useAiAssistantStatus();
  const mutation = useCreateClinicalAiDraft();
  const [task, setTask] = React.useState<ClinicalAiTask>(defaultTask);
  const [prompt, setPrompt] = React.useState(defaultPrompt);
  const [copied, setCopied] = React.useState(false);

  const selectedTask = clinicalAiTaskOptions.find(
    (item) => item.value === task,
  );
  const output = mutation.data?.output;

  const errorMessage = React.useMemo(() => {
    if (!mutation.error) return null;
    if (mutation.error instanceof ApiError) return mutation.error.message;
    if (mutation.error instanceof Error) return mutation.error.message;
    return "Unable to generate the draft.";
  }, [mutation.error]);

  const handleGenerate = async () => {
    await mutation.mutateAsync({
      task,
      prompt: prompt.trim() || undefined,
      context,
      audience: selectedTask?.label,
    });
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!output || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
  };

  const hasContext = Boolean(context && Object.keys(context).length > 0);
  const isConfigured = status.data?.enabled ?? false;

  return (
    <Card className="surface-spotlight rounded-lg py-0">
      <CardHeader className="relative border-b border-border/70 px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">{title}</CardTitle>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={cn(
                "rounded-md border px-2.5 py-1",
                isConfigured
                  ? "border-emerald-500/20 bg-success/10 text-success"
                  : "border-amber-500/20 bg-amber-500/10 text-warning",
              )}
            >
              {isConfigured ? "AI online" : "API key needed"}
            </Badge>
            {status.data?.model ? (
              <Badge className="rounded-md border border-slate-500/20 bg-slate-500/10 text-muted-foreground">
                {status.data.model}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative grid gap-5 p-5 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Output type</label>
            <Select
              value={task}
              onValueChange={(value) => setTask(value as ClinicalAiTask)}
            >
              <SelectTrigger className="h-11 w-full rounded-md">
                <SelectValue placeholder="Select output type" />
              </SelectTrigger>
              <SelectContent>
                {clinicalAiTaskOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">
              {selectedTask?.description}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Instruction</label>
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Example: Draft a concise SOAP note using the available encounter context. Do not add facts that are not documented."
              className="min-h-36 rounded-md"
            />
          </div>

          <div className="rounded-md border border-border bg-muted/35 p-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <p className="text-xs leading-5 text-muted-foreground">
                AI text is a draft. A licensed clinician must verify facts,
                clinical judgment, orders, and final wording before use.
              </p>
            </div>
          </div>

          {hasContext ? (
            <div className="rounded-md border border-border bg-background/70 p-3">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                Context attached
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                Current encounter details are attached with direct identifiers
                minimized where possible.
              </p>
            </div>
          ) : null}

          {!isConfigured && !status.isLoading ? (
            <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-5 text-warning">
              Set `GEMINI_API_KEY` on the backend service to enable Google
              Gemini drafting. The browser never receives the key.
            </div>
          ) : null}

          <Button
            type="button"
            className="h-11 w-full rounded-md bg-primary text-white hover:bg-brand-strong"
            disabled={
              mutation.isPending ||
              status.isLoading ||
              !isConfigured ||
              (!prompt.trim() && !hasContext)
            }
            onClick={handleGenerate}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate draft
          </Button>
        </div>

        <div
          className={cn(
            "rounded-md border border-border bg-background/80 p-4",
            compact ? "min-h-72" : "min-h-[30rem]",
          )}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                AI draft
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Review before saving into the clinical record.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-md"
              disabled={!output}
              onClick={handleCopy}
            >
              <Clipboard className="h-4 w-4" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          {errorMessage ? (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : output ? (
            <div className="whitespace-pre-wrap rounded-md border border-border bg-card p-4 text-sm leading-7 text-foreground shadow-sm">
              {output}
            </div>
          ) : (
            <div className="flex h-full min-h-56 items-center justify-center rounded-md border border-dashed border-border bg-muted/25 p-6 text-center">
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                Choose a draft type, add instructions, and generate. The result
                will appear here ready for clinician review and copying.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
