import { Code2, Database, LayoutTemplate, MessageCircle, PhoneCall } from "lucide-react";
import { PublicSiteHeader } from "@/components/public/public-site-header";
import { Button } from "@/components/ui/button";
import { creatorContacts, getWhatsappLink } from "@/lib/creator-contacts";

const panels = [
  {
    label: "Backend",
    icon: Database,
    image: "/creators/eng-otieno.png",
  },
  {
    label: "Frontend",
    icon: LayoutTemplate,
    image:
      "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1000&q=88",
  },
  {
    label: "Hospital work",
    icon: Code2,
    image:
      "https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=1000&q=88",
  },
];

export default function CreatorsPage() {
  return (
    <main className="min-h-screen bg-[#eef8ff] text-foreground">
      <PublicSiteHeader />
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid min-h-[calc(100vh-82px)] max-w-[1540px] gap-6 px-5 py-8 md:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase text-module">
              System creators
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
              Built by practical software engineers.
            </h1>
            <p className="max-w-xl text-base leading-8 text-muted-foreground">
              Backend logic, frontend workflow, reporting, payments, and
              hospital operations handled as one product.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {panels.map((panel) => {
              const Icon = panel.icon;
              return (
                <div key={panel.label} className="border border-border bg-[#f7fcff] p-3 shadow-xl">
                  <div
                    className="h-[470px] bg-cover bg-center"
                    style={{ backgroundImage: `url('${panel.image}')` }}
                  />
                  <div className="mt-3 flex items-center gap-2 text-sm font-bold text-module">
                    <Icon className="h-4 w-4" />
                    {panel.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1540px] gap-5 px-5 py-8 md:px-8 lg:grid-cols-2">
        {creatorContacts.map((creator) => (
          <article key={creator.name} className="grid overflow-hidden border border-border bg-card shadow-xl md:grid-cols-[220px_1fr]">
            <div
              className="min-h-[280px] bg-cover bg-center"
              style={{
                backgroundImage:
                  creator.name.includes("Otieno")
                    ? "url('/creators/eng-otieno.png')"
                    : "url('https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1000&q=88')",
              }}
            />
            <div className="p-6">
              <h2 className="text-3xl font-bold text-foreground">{creator.name}</h2>
              <p className="mt-1 text-sm font-semibold text-module">
                {creator.role}
              </p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {creator.focus}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <PhoneCall className="h-4 w-4 text-module" />
                  {creator.phone}
                </div>
                <Button asChild className="rounded-md bg-primary text-white hover:bg-brand-strong">
                  <a
                    href={getWhatsappLink(creator.whatsappNumber, creator.message)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
