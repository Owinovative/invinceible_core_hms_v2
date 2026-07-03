import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  FlaskConical,
  Pill,
  ReceiptText,
  UserRound,
} from "lucide-react";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Profile", href: "/patient-access/profile", icon: UserRound },
  {
    title: "Appointments",
    href: "/patient-access/appointments",
    icon: CalendarDays,
  },
  { title: "Invoices", href: "/patient-access/invoices", icon: ReceiptText },
  {
    title: "Lab results",
    href: "/patient-access/lab-results",
    icon: FlaskConical,
  },
  { title: "Prescriptions", href: "/patient-access/prescriptions", icon: Pill },
];

export function PatientPortalShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#eef8ff] text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-4 md:px-8">
          <AppLogo />
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              className="rounded-md border-border"
            >
              <Link href="/">Home</Link>
            </Button>
            <Button
              asChild
              className="rounded-md bg-primary text-white hover:bg-brand-strong"
            >
              <Link href="/login">
                Staff login
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1400px] gap-6 px-5 py-8 md:px-8 lg:grid-cols-[280px_1fr]">
        <aside className="border border-border bg-card p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase text-module">
            Patient portal
          </p>
          <nav className="grid gap-2">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  href={item.href}
                  key={item.href}
                  className="flex items-center gap-3 border border-border bg-[#f7fcff] px-3 py-3 text-sm font-semibold text-foreground hover:border-border-strong"
                >
                  <Icon className="h-4 w-4 text-module" />
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-h-[620px] border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-bold uppercase text-module">
            Secure patient access
          </p>
          <h1 className="mt-2 text-4xl font-bold text-foreground">{title}</h1>
          <div className="mt-6">{children}</div>
        </section>
      </section>
    </main>
  );
}
