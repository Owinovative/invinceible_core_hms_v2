import Link from "next/link";
import { ArrowRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] gradient-border panel-shadow p-10 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-cyan-500/5 to-transparent" />
        <div className="relative space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg">
            <Activity className="h-7 w-7" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Invinceible Core HMS
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Hospital operations, clinical flow, billing, stock, alerts, and reporting in one system.
            </p>
          </div>

          <Button asChild size="lg" className="rounded-2xl px-6">
            <Link href="/login">
              Sign in
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
