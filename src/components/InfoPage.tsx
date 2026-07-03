import { Mail } from "lucide-react";
import type { ReactNode } from "react";

type InfoSection = {
  title: string;
  body: ReactNode;
};

export const CONTACT_EMAIL = "briefxify@gmail.com";

export function InfoPage({
  title,
  eyebrow,
  intro,
  sections,
  showContact = true,
}: {
  title: string;
  eyebrow: string;
  intro: string;
  sections: InfoSection[];
  showContact?: boolean;
}) {
  return (
    <section className="mx-auto max-w-4xl px-4 pb-20 pt-32 sm:px-6 sm:pt-40">
      <div className="mb-10">
        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/50">
          {eyebrow}
        </span>
        <h1 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-6xl">
          {title}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-white/65">{intro}</p>
      </div>

      <div className="divide-y divide-white/10 border-y border-white/10">
        {sections.map((section) => (
          <section key={section.title} className="py-8">
            <h2 className="font-display text-2xl font-semibold text-white">
              {section.title}
            </h2>
            <div className="article-body mt-4 text-base">{section.body}</div>
          </section>
        ))}
      </div>

      {showContact && (
        <div className="mt-10 rounded-lg border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-display text-xl font-semibold">Contact BRIEFXIFY</h2>
          <p className="mt-2 text-sm leading-6 text-white/60">
            For privacy requests, corrections, copyright concerns, complaints, or
            general questions, email us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-cyan-300 underline underline-offset-4 hover:text-white"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/75 transition hover:border-white/30 hover:text-white"
          >
            <Mail className="h-4 w-4" />
            Send email
          </a>
        </div>
      )}
    </section>
  );
}
