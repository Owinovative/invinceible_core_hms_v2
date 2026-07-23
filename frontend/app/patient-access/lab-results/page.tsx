"use client";

import { FileCheck2, Loader2 } from "lucide-react";
import { PatientPortalShell } from "@/components/patient-portal/patient-portal-shell";
import { usePatientPortalLabResults } from "@/hooks/use-patient-portal-lab-results";

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function PatientAccessLabResultsPage() {
  const { data = [], isLoading, error } = usePatientPortalLabResults();

  return (
    <PatientPortalShell title="Lab results">
      <div className="space-y-4">
        <div className="border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
          Only results validated and released by the laboratory are shown.
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading released results…
          </div>
        ) : null}
        {error ? (
          <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error instanceof Error ? error.message : "Unable to load results."}
          </div>
        ) : null}
        {!isLoading && !error && data.length === 0 ? (
          <div className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No laboratory results have been released to your portal.
          </div>
        ) : null}
        {data.map((order) => (
          <section key={order.id} className="border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">
                  {order.orderNumber}
                </p>
                <p className="text-xs text-muted-foreground">
                  Ordered {formatDate(order.createdAt)}
                </p>
              </div>
              <span className="border border-success/25 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                RELEASED
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {order.items.flatMap((item) =>
                item.results.map((result) => (
                  <article
                    key={result.id}
                    className="border border-border bg-surface-2 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <FileCheck2 className="mt-0.5 h-5 w-5 text-module" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">
                          {item.test.testName}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                          {result.resultValue}
                        </p>
                        {result.remarks ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {result.remarks}
                          </p>
                        ) : null}
                        <p className="mt-3 text-xs text-muted-foreground">
                          Released {formatDate(result.releasedAt)}
                        </p>
                      </div>
                    </div>
                  </article>
                )),
              )}
            </div>
          </section>
        ))}
      </div>
    </PatientPortalShell>
  );
}
