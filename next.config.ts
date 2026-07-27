import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native / heavy server deps out of the App Hosting server bundle.
  serverExternalPackages: ["sharp", "firebase-admin", "stripe"],
};

export default nextConfig;
