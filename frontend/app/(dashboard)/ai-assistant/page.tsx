import { Bot, FileCheck2, FlaskConical, Pill, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ClinicalAiAssistant } from "@/components/ai/clinical-ai-assistant";

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
    text: "Prepare clear medication counselling text for pharmacist review.",
    icon: Pill,
  },
  {
    title: "Reports and letters",
    text: "Turn rough staff text into polished hospital-ready language.",
    icon: FileCheck2,
  },
];

export default function AiAssistantPage() {
  return (
    <div className="space-y-6">
      <section className="premium-card relative overflow-hidden rounded-lg p-6 md:p-8">
        <div className="clinical-mesh opacity-30" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-md border-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              AI drafting workspace
            </Badge>
            <div className="flex items-center gap-3">
              <div className="flex h-13 w-13 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Clinical AI Assistant
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-7 text-muted-foreground">
                  Draft clinical text faster, then review and copy it into the
                  correct module. The assistant never replaces the clinician.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {useCases.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="premium-card rounded-lg p-4">
              <div className="relative flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
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

      <ClinicalAiAssistant
        defaultTask="GENERAL_DRAFT"
        subtitle="Use this general workspace for notes, summaries, patient instructions, billing wording, pharmacy counselling, and report text."
      />
    </div>
  );
}
