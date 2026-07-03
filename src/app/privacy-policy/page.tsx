import type { Metadata } from "next";
import { CONTACT_EMAIL, InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for BRIEFXIFY, including the information we collect, how we use it, and how to contact us.",
};

export default function PrivacyPolicyPage() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="Last updated: July 1, 2026. This Privacy Policy explains how BRIEFXIFY handles information when you use this website."
      sections={[
        {
          title: "Information we collect",
          body: (
            <>
              <p>
                BRIEFXIFY may process basic technical information such as browser
                type, device type, pages visited, referring pages, approximate
                location derived from IP address, and timestamps. We may also
                store your selected language preference in a cookie so the site can
                show content in your chosen language.
              </p>
              <p>
                If you contact us by email, we will receive the information you
                choose to include, such as your name, email address, message, and
                any attachments.
              </p>
            </>
          ),
        },
        {
          title: "How we use information",
          body: (
            <>
              <p>
                We use information to operate the website, improve performance,
                maintain security, remember preferences, respond to messages,
                review complaints, process correction requests, and understand
                which stories are useful to readers.
              </p>
              <p>
                We do not sell personal information. We may share limited
                information with service providers that help us host, secure,
                analyze, or maintain the website, or when required by law.
              </p>
            </>
          ),
        },
        {
          title: "Cookies and third-party services",
          body: (
            <>
              <p>
                The website may use cookies, local storage, analytics, hosting
                infrastructure, and news APIs. Third-party websites linked from
                BRIEFXIFY have their own privacy practices, and their policies
                apply when you leave this website.
              </p>
              <p>
                You can control cookies through your browser settings. Some
                features, such as language preference, may not work as expected if
                cookies are disabled.
              </p>
            </>
          ),
        },
        {
          title: "Your choices and requests",
          body: (
            <p>
              You may request access, correction, deletion, or withdrawal of
              consent for personal information you have shared with us, subject to
              applicable law and legitimate record-keeping needs. Send requests to{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          ),
        },
        {
          title: "Children's privacy",
          body: (
            <p>
              BRIEFXIFY is intended for a general audience and is not directed to
              children. If you believe a child has provided personal information,
              contact us so we can review and delete it where appropriate.
            </p>
          ),
        },
        {
          title: "Data security and retention",
          body: (
            <p>
              We use reasonable technical and organizational measures to protect
              information. No internet service is completely secure. We keep
              information only as long as needed for the purposes described in this
              policy, legal compliance, dispute resolution, and site security.
            </p>
          ),
        },
      ]}
    />
  );
}
