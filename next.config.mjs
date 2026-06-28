/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // News thumbnails come from arbitrary external hosts (GNews / sample data).
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  experimental: {
    // Enables instrumentation.ts (the cron scheduler / boot sync).
    instrumentationHook: true,
    // node-cron / prisma must stay external (not bundled by webpack), otherwise
    // their dynamic worker requires break the server build.
    serverComponentsExternalPackages: ["node-cron", "@prisma/client", "bcryptjs"],
  },
};

export default nextConfig;
