import type { Metadata } from "next";
import { CONTACT_EMAIL, InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact BRIEFXIFY for corrections, privacy requests, copyright concerns, complaints, or general questions.",
};

export default function ContactUsPage() {
  return (
    <InfoPage
      eyebrow="Support"
      title="Contact Us"
      intro="For questions, corrections, privacy requests, copyright concerns, complaints, or business inquiries, contact BRIEFXIFY by email."
      showContact={false}
      sections={[
        {
          title: "Email",
          body: (
            <p>
              Send your message to{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. This is
              the official contact address for BRIEFXIFY website requests.
            </p>
          ),
        },
        {
          title: "For faster review",
          body: (
            <>
              <p>
                Include the relevant page URL, a clear description of the issue,
                your contact details, and any documents or screenshots that help
                explain the request.
              </p>
              <p>
                For copyright or rights-related complaints, include proof that you
                own or are authorized to act for the content owner.
              </p>
            </>
          ),
        },
        {
          title: "Response",
          body: (
            <p>
              We review reasonable requests and aim to respond as soon as
              practical. Urgent legal, privacy, safety, or copyright concerns
              should be clearly marked in the email subject.
            </p>
          ),
        },
        {
          title: "Send an email",
          body: (
            <p>
              <a href={`mailto:${CONTACT_EMAIL}`}>Open your email app</a> to send
              a message to BRIEFXIFY.
            </p>
          ),
        },
      ]}
    />
  );
}
