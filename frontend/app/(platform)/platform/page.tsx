import {
  Building2,
  GitBranch,
  Shield,
  UserCog,
  Users,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const items = [
  {
    title: "Facilities",
    description: "Register and manage facilities",
    href: "/platform/facilities",
    icon: Building2,
  },
  {
    title: "Branches",
    description: "Manage facility branches",
    href: "/platform/branches",
    icon: GitBranch,
  },
  {
    title: "Users",
    description: "Create and control system users",
    href: "/platform/users",
    icon: Users,
  },
  {
    title: "Staff",
    description: "Manage staff directory and linking",
    href: "/platform/staff",
    icon: UserCog,
  },
  {
    title: "Clinics",
    description: "Manage clinics and service points",
    href: "/platform/clinics",
    icon: Stethoscope,
  },
];

export default function PlatformHomePage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border gradient-border panel-shadow p-6 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-fuchsia-500/5 to-transparent" />
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative space-y-3">
          <Badge className="rounded-full border-0 bg-violet-600/10 px-3 py-1 text-violet-700 dark:text-violet-300">
            Restricted Area
          </Badge>

          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-violet-500/10">
              <Shield className="h-7 w-7 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Platform Administration
              </h1>
              <p className="text-muted-foreground">
                Secure setup area for facilities, branches, users, staff, and platform structure.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <Card className="rounded-[1.8rem] gradient-border panel-shadow transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-violet-500/10">
                    <Icon className="h-7 w-7 text-violet-600 dark:text-violet-400" />
                  </div>

                  <h2 className="text-xl font-bold tracking-tight">{item.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
