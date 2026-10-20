import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {},
  // better-sqlite3 is a native Node.js module; keep it external to the
  // browser bundle so it only runs on the server.
  serverExternalPackages: ["better-sqlite3"],
  // The integration tests start their own server. A separate build directory
  // lets it run next to a development server without fighting over the lock
  // file that `next dev` keeps in .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
