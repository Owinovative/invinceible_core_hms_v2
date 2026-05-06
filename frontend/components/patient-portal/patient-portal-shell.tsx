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
    <main className="min-h-screen bg-[#eef8ff] text-slate-950">
      <header className="border-b border-sky-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-4 md:px-8">
          <AppLogo />
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              className="rounded-md border-sky-200"
            >
              <Link href="/">Home</Link>
            </Button>
            <Button
              asChild
              className="rounded-md bg-sky-700 text-white hover:bg-sky-800"
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
        <aside className="border border-sky-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase text-sky-700">
            Patient portal
          </p>
          <nav className="grid gap-2">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  href={item.href}
                  key={item.href}
                  className="flex items-center gap-3 border border-sky-100 bg-[#f7fcff] px-3 py-3 text-sm font-semibold text-slate-800 hover:border-sky-300"
                >
                  <Icon className="h-4 w-4 text-sky-700" />
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-h-[620px] border border-sky-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase text-sky-700">
            Secure patient access
          </p>
          <h1 className="mt-2 text-4xl font-bold text-slate-950">{title}</h1>
          <div className="mt-6">{children}</div>
        </section>
      </section>
    </main>
  );
}
