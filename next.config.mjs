/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // News thumbnails come from arbitrary external hosts (GNews / sample data).
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    // Serve images straight from the source instead of routing them through
    // Vercel's image optimizer. The free plan's optimization quota gets
    // exhausted (the optimizer then returns HTTP 402 and every thumbnail
    // fails). Unoptimized delivery has no such quota, so images always load.
    unoptimized: true,
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
