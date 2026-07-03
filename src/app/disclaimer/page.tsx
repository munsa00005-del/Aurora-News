import type { Metadata } from "next";
import { CONTACT_EMAIL, InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "Disclaimer for BRIEFXIFY covering third-party news, AI-assisted summaries, external links, and professional advice limitations.",
};

export default function DisclaimerPage() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="Disclaimer"
      intro="BRIEFXIFY provides news discovery, summaries, and links for general information. Please read these terms before relying on any content."
      sections={[
        {
          title: "General information only",
          body: (
            <p>
              Content on BRIEFXIFY is provided for general informational purposes.
              We aim to keep information useful and current, but we do not
              guarantee completeness, accuracy, availability, or timeliness.
              Readers should verify important information from the original source
              or an appropriate professional.
            </p>
          ),
        },
        {
          title: "No professional advice",
          body: (
            <p>
              BRIEFXIFY does not provide legal, medical, financial, investment,
              tax, safety, or other professional advice. Do not make decisions
              based only on content from this website. Consult a qualified
              professional for advice about your specific situation.
            </p>
          ),
        },
        {
          title: "Third-party news and external links",
          body: (
            <p>
              BRIEFXIFY may display headlines, summaries, images, source names,
              and links from third-party publishers and news APIs. Rights in
              third-party content belong to their respective owners. External
              websites are not controlled by BRIEFXIFY, and we are not responsible
              for their content, policies, changes, or availability.
            </p>
          ),
        },
        {
          title: "AI-assisted content",
          body: (
            <p>
              Some summaries or article rewrites may be generated or assisted by
              automated tools. AI-generated text can contain errors, omissions, or
              outdated context. If a story matters to you, review the linked
              original source before relying on it.
            </p>
          ),
        },
        {
          title: "Corrections, takedowns, and complaints",
          body: (
            <p>
              If you believe content is inaccurate, unlawful, defamatory,
              infringing, or violates your rights, email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with the
              URL, the issue, and supporting details. We will review reasonable
              requests and take appropriate action where required.
            </p>
          ),
        },
        {
          title: "Limitation of liability",
          body: (
            <p>
              To the maximum extent permitted by law, BRIEFXIFY and its operators
              are not liable for losses or damages arising from use of the
              website, reliance on content, external links, technical issues, or
              service interruptions.
            </p>
          ),
        },
      ]}
    />
  );
}
