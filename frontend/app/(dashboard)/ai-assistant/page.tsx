"use client";

import { Bot, FileCheck2, FlaskConical, Pill, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ClinicalAiAssistant } from "@/components/ai/clinical-ai-assistant";
import { SystemNavigatorAssistant } from "@/components/dashboard/system-navigator-assistant";
import { useSystemHealth, useUnresolvedCounts } from "@/hooks/use-dashboard-data";
import { useAuth } from "@/providers/auth-provider";
import { useScope } from "@/providers/scope-provider";

const useCases = [
  {
    title: "Doctor notes",
    text: "Draft SOAP notes, assessment wording, plans, and follow-up instructions.",
    icon: Stethoscope,
  },
  {
    title: "Lab summaries",
    text: "Summarize provided lab context in a clean review format.",
    icon: FlaskConical,
  },
  {
    title: "Pharmacy counselling",
    text: "Prepare medication counselling text for pharmacist review.",
    icon: Pill,
  },
  {
    title: "Reports and letters",
    text: "Turn rough staff text into polished hospital-ready language.",
    icon: FileCheck2,
  },
];

export default function AiAssistantPage() {
  const { user } = useAuth();
  const { facilityId, facilityName, selectedBranchId, selectedBranchName } =
    useScope();
  const systemHealth = useSystemHealth({
    facilityId,
    branchId: selectedBranchId,
  });
  const unresolvedCounts = useUnresolvedCounts({
    facilityId,
    branchId: selectedBranchId,
  });

  const health = systemHealth.data;
  const counts = unresolvedCounts.data;
  const scopeText = facilityName
    ? `${facilityName} - ${selectedBranchName || "All allowed branches"}`
    : "No facility scope";

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-sky-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-md border-0 bg-sky-100 text-sky-800">
              Two AI workspaces
            </Badge>
            <div className="flex items-center gap-3">
              <div className="flex h-13 w-13 items-center justify-center rounded-md border border-sky-200 bg-sky-50 text-sky-700">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  AI Assistant
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-7 text-muted-foreground">
                  Clinical AI drafts medical text. System AI guides users to
                  the correct module and next step. The clinician still reviews
                  all clinical output before use.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-sky-200 bg-sky-50/70 p-4">
        {useCases.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex items-start gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-sky-200 bg-sky-50 text-sky-700">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="space-y-6">
        <ClinicalAiAssistant
          defaultTask="GENERAL_DRAFT"
          subtitle="Use this workspace for notes, summaries, patient instructions, pharmacy counselling, report text, and discharge wording."
        />

        <SystemNavigatorAssistant
          user={user}
          scopeText={scopeText}
          healthScore={health?.healthScore ?? "--"}
          openAlerts={counts?.counts.total ?? 0}
          activeAdmissions={health?.summary.activeAdmissions ?? 0}
          pendingLabs={health?.summary.pendingLabQueue ?? 0}
        />
      </section>
    </div>
  );
}
