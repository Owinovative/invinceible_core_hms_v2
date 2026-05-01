import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";

export function PublicSiteHeader() {
  return (
    <header className="border-b border-sky-200 bg-white">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-4 md:px-8">
        <Link href="/" aria-label="Invinceible Core HMS home">
          <AppLogo />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
          <Link href="/workflow" className="hover:text-sky-800">
            Workflow
          </Link>
          <Link href="/facilities" className="hover:text-sky-800">
            Facilities
          </Link>
          <Link href="/creators" className="hover:text-sky-800">
            Creators
          </Link>
        </nav>
        <Button asChild className="rounded-md bg-sky-700 text-white hover:bg-sky-800">
          <Link href="/login">
            Enter system
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
