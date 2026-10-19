import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {},
  // better-sqlite3 is a native Node.js module; keep it external to the
  // browser bundle so it only runs on the server.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
