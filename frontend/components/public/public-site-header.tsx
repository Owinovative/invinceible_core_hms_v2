import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function PublicSiteHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-5 md:px-8">
        <Link href="/" aria-label="Invinceible Core HMS home">
          <AppLogo />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-muted-foreground md:flex">
          <Link href="/workflow" className="hover:text-module">
            Workflow
          </Link>
          <Link href="/facilities" className="hover:text-module">
            Facilities
          </Link>
          <Link href="/inspiration" className="hover:text-module">
            Inspiration
          </Link>
          <Link href="/reviews" className="hover:text-module">
            Reviews
          </Link>
          <Link href="/creators" className="hover:text-module">
            Creators
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild className="rounded-md bg-primary text-primary-foreground hover:bg-primary">
            <Link href="/login">
              Enter system
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
