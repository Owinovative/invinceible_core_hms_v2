"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/theme-toggle";

interface TocItem {
  id: string;
  title: string;
  level: number;
}

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  version: string;
  toc: TocItem[];
  children: React.ReactNode;
}

export function LegalPageLayout({
  title,
  lastUpdated,
  version,
  toc,
  children,
}: LegalPageProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      // Calculate scroll progress
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const scroll = `${totalScroll / windowHeight}`;
      setScrollProgress(Number(scroll));

      // Determine active section
      let currentActiveId = "";
      for (const item of toc) {
        const element = document.getElementById(item.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          // Adjust threshold based on layout header height
          if (rect.top <= 120) {
            currentActiveId = item.id;
          }
        }
      }
      setActiveId(currentActiveId);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [toc]);

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    id: string,
  ) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen bg-background">
      <div className="fixed top-4 right-4 z-40 rounded-lg border border-border bg-card/85 shadow-sm backdrop-blur-sm print:hidden">
        <ThemeToggle />
      </div>
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 z-50 h-1 w-full bg-muted print:hidden">
        <div
          className="h-full bg-brand transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Main Content */}
          <main className="lg:col-span-8 xl:col-span-9">
            <header className="mb-12 border-b pb-8">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                {title}
              </h1>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <p>Last updated: {lastUpdated}</p>
                <span className="hidden sm:inline">•</span>
                <p>Version {version}</p>
              </div>
            </header>

            <div className="prose prose-slate prose-headings:scroll-mt-28 prose-a:text-brand max-w-none dark:prose-invert print:prose-p:text-black">
              {children}
            </div>
          </main>

          {/* Sticky Sidebar */}
          <aside className="hidden lg:col-span-4 lg:block xl:col-span-3 print:hidden">
            <div className="sticky top-24 pt-10 lg:pt-0">
              <h3 className="mb-4 text-sm font-semibold tracking-wide text-foreground uppercase">
                On this page
              </h3>
              <ScrollArea className="h-[calc(100vh-12rem)] pb-10">
                <nav className="flex flex-col space-y-3">
                  {toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={(e) => handleNavClick(e, item.id)}
                      className={cn(
                        "text-sm transition-colors hover:text-foreground",
                        activeId === item.id
                          ? "font-medium text-brand"
                          : "text-muted-foreground",
                        item.level === 2 ? "pl-0" : "pl-4",
                      )}
                    >
                      {item.title}
                    </a>
                  ))}
                </nav>
              </ScrollArea>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
