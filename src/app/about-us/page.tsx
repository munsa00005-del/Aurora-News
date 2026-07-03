import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about BRIEFXIFY, a news discovery platform for trending stories across major categories.",
};

export default function AboutUsPage() {
  return (
    <InfoPage
      eyebrow="Company"
      title="About Us"
      intro="BRIEFXIFY is a digital news discovery platform built to help readers find trending stories across India, world affairs, sports, AI, technology, economy, crime, entertainment, science, and health."
      sections={[
        {
          title: "What we do",
          body: (
            <p>
              BRIEFXIFY collects and organizes publicly available news signals
              from trusted sources and news providers. We help readers scan
              important stories quickly, then visit the original publisher for the
              full report and additional context.
            </p>
          ),
        },
        {
          title: "Editorial approach",
          body: (
            <p>
              Our goal is to present source-attributed, useful, and easy-to-read
              news information. We may use automation and AI-assisted workflows to
              summarize or rank stories, but we expect users to verify sensitive
              or high-impact information from the linked original source.
            </p>
          ),
        },
        {
          title: "Ownership and operation",
          body: (
            <p>
              BRIEFXIFY is operated as an independent website. Third-party article
              rights, trademarks, names, logos, and images remain the property of
              their respective owners.
            </p>
          ),
        },
        {
          title: "Feedback",
          body: (
            <p>
              We welcome corrections, source concerns, copyright notices,
              suggestions, and general feedback through the contact email listed
              on this website.
            </p>
          ),
        },
      ]}
    />
  );
}
