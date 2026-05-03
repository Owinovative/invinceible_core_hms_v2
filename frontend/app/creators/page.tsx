import { Code2, Database, LayoutTemplate, MessageCircle, PhoneCall } from "lucide-react";
import { PublicSiteHeader } from "@/components/public/public-site-header";
import { Button } from "@/components/ui/button";
import { creatorContacts, getWhatsappLink } from "@/lib/creator-contacts";

export default function CreatorsPage() {
  return (
    <main className="min-h-screen bg-[#eef8ff] text-slate-900">
      <PublicSiteHeader />
      <section className="border-b border-sky-200 bg-white text-slate-950">
        <div className="mx-auto grid min-h-[calc(100vh-82px)] max-w-[1500px] gap-8 px-5 py-8 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase text-sky-700">
              System creators
            </p>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
              Built by engineers who understand real operations.
            </h1>
            <p className="max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
              Eng. Otieno Owino and Eng. Moikoyo Paul build practical
              full-stack systems for hospitals, businesses, and teams that need
              reliable daily tools.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-[0.86fr_1.14fr]">
            <div
              className="min-h-[540px] border border-sky-200 bg-cover bg-center shadow-xl"
              style={{
                backgroundImage: "url('/creators/eng-otieno.png')",
              }}
            />
            <div className="grid content-stretch gap-4">
              <div className="border border-sky-200 bg-[#f4fbff] p-6 shadow-sm">
                <Database className="mb-4 h-7 w-7 text-sky-700" />
                <p className="text-xl font-bold">Backend systems</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  APIs, databases, workflow rules, security, and operational
                  logic.
                </p>
              </div>
              <div className="border border-sky-200 bg-[#f4fbff] p-6 shadow-sm">
                <LayoutTemplate className="mb-4 h-7 w-7 text-sky-700" />
                <p className="text-xl font-bold">Frontend products</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Interfaces, dashboards, forms, reports, and user workflows.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1500px] gap-5 px-5 py-8 md:px-8 lg:grid-cols-2">
        {creatorContacts.map((creator) => (
          <article key={creator.name} className="border border-sky-200 bg-white p-6 shadow-xl">
            <div className="mb-5 flex h-14 w-14 items-center justify-center border border-sky-200 bg-sky-50 text-sky-700">
              <Code2 className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold text-slate-950">{creator.name}</h2>
            <p className="mt-1 text-sm font-semibold text-sky-700">
              {creator.role}
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {creator.focus}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <PhoneCall className="h-4 w-4 text-sky-700" />
                {creator.phone}
              </div>
              <Button asChild className="rounded-md bg-sky-600 text-white hover:bg-sky-700">
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
          </article>
        ))}
      </section>
    </main>
  );
}
