"use client";

import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreateUserForm } from "@/components/platform/users/create-user-form";
import { UsersTable } from "@/components/platform/users/users-table";

export default function PlatformUsersPage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border surface-spotlight shadow-md p-6 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/10 via-emerald-500/5 to-transparent" />
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative space-y-3">
          <Badge className="rounded-full border-0 bg-cyan-600/10 px-3 py-1 text-module">
            Platform Access
          </Badge>

          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-cyan-500/10">
              <Users className="h-7 w-7 text-module" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Users
              </h1>
              <p className="text-muted-foreground">
                Create and manage platform users, access scope, and account state.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CreateUserForm />
      <UsersTable />
    </div>
  );
}
