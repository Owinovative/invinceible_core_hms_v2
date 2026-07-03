"use client";

import { Bot, FileCheck2, FlaskConical, Pill, Stethoscope, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ClinicalAiAssistant } from "@/components/ai/clinical-ai-assistant";
import { SystemNavigatorAssistant } from "@/components/dashboard/system-navigator-assistant";
import { useSystemHealth, useUnresolvedCounts } from "@/hooks/use-dashboard-data";
import { useAuth } from "@/providers/auth-provider";
import { useScope } from "@/providers/scope-provider";
import { cn } from "@/lib/utils";

const useCases = [
  {
    title: "SOAP Notes",
    text: "Draft assessments, plans, and follow-ups.",
    icon: Stethoscope,
  },
  {
    title: "Lab Analysis",
    text: "Summarize raw lab context instantly.",
    icon: FlaskConical,
  },
  {
    title: "Pharmacy Scripts",
    text: "Generate medication counselling text.",
    icon: Pill,
  },
  {
    title: "Document Polish",
    text: "Format text into hospital-ready language.",
    icon: FileCheck2,
  },
];

export default function AiAssistantPage() {
  const { user } = useAuth();
  const { facilityId, facilityName, selectedBranchId, selectedBranchName } = useScope();
  
  const systemHealth = useSystemHealth({ facilityId, branchId: selectedBranchId });
  const unresolvedCounts = useUnresolvedCounts({ facilityId, branchId: selectedBranchId });

  const health = systemHealth.data;
  const counts = unresolvedCounts.data;
  const scopeText = facilityName ? `${facilityName} / ${selectedBranchName || "Global"}` : "System Wide";

  return (
    <div className="flex flex-col gap-8 animate-enter pb-12 max-w-[1600px] mx-auto">
      
      {/* PREMIUM HEADER */}
      <div className="rounded-[2.5rem] bg-card/85 backdrop-blur-md shadow-md overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 text-white relative">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Bot className="w-64 h-64 text-cyan-400 blur-2xl" />
        </div>
        
        <div className="relative p-10 md:p-14 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-2xl">
            <Badge className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 border-0 shadow-none px-3 py-1 mb-6 font-bold uppercase tracking-widest text-[10px]">
              <Sparkles className="h-3 w-3 mr-2" /> Intelligence Layer
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
              System AI Assistant
            </h1>
            <p className="text-sm font-medium text-subtle leading-relaxed max-w-xl">
              Engineered to process clinical summaries and navigate operational queues. Dual-engine architecture separates clinical drafting from system navigation.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 shrink-0">
            {useCases.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-card/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
                  <Icon className="h-5 w-5 text-cyan-400 mb-3" />
                  <p className="text-xs font-bold text-slate-200">{item.title}</p>
                  <p className="text-[10px] font-medium text-muted-foreground mt-1">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* WORKSPACES GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        
        {/* Clinical Engine */}
        <div className="rounded-[2rem] bg-card/85 backdrop-blur-md shadow-md bg-card/60 border border-white/60 flex flex-col">
          <div className="p-6 md:p-8 border-b border-border/50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-module mb-1">Engine 01</p>
            <h2 className="text-xl font-black text-foreground">Clinical Drafting</h2>
          </div>
          <div className="p-4 md:p-6 flex-1">
            <ClinicalAiAssistant
              defaultTask="GENERAL_DRAFT"
              subtitle="Operates in a strict clinical context mode. Review all outputs before saving to patient records."
            />
          </div>
        </div>

        {/* System Engine */}
        <div className="rounded-[2rem] bg-card/85 backdrop-blur-md shadow-md bg-card/60 border border-white/60 flex flex-col">
          <div className="p-6 md:p-8 border-b border-border/50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-success mb-1">Engine 02</p>
            <h2 className="text-xl font-black text-foreground">System Navigator</h2>
          </div>
          <div className="p-4 md:p-6 flex-1">
            <SystemNavigatorAssistant
              user={user}
              scopeText={scopeText}
              healthScore={health?.healthScore ?? "--"}
              openAlerts={counts?.counts.total ?? 0}
              activeAdmissions={health?.summary.activeAdmissions ?? 0}
              pendingLabs={health?.summary.pendingLabQueue ?? 0}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
