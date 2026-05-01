import { Code2, MessageCircle, PhoneCall } from "lucide-react";
import { PublicSiteHeader } from "@/components/public/public-site-header";
import { Button } from "@/components/ui/button";
import { creatorContacts, getWhatsappLink } from "@/lib/creator-contacts";

export default function CreatorsPage() {
  return (
    <main className="min-h-screen bg-[#f5fbff] text-slate-900">
      <PublicSiteHeader />
      <section className="border-b border-sky-200 bg-white text-slate-950">
        <div className="mx-auto max-w-[1180px] px-5 py-12 md:px-8 md:py-16">
          <p className="text-sm font-semibold uppercase text-sky-700">
            System creators
          </p>
          <h1 className="mt-2 max-w-4xl text-4xl font-bold leading-tight md:text-5xl">
            Built by Eng. Otieno Owino and Eng. Moikoyo Paul.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            The system is built by two full-stack software engineers with more
            than 7 years of software delivery experience. Eng. Otieno Owino
            leads backend work. Eng. Moikoyo Paul leads frontend work.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1180px] gap-4 px-5 py-12 md:px-8 md:py-16 lg:grid-cols-2">
        {creatorContacts.map((creator) => (
          <article key={creator.name} className="border border-sky-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex h-12 w-12 items-center justify-center border border-sky-200 bg-sky-50 text-sky-700">
              <Code2 className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-950">{creator.name}</h2>
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
              <Button asChild className="rounded-md bg-sky-700 text-white hover:bg-sky-800">
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
