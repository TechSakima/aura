import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep sharp's native bindings out of the server bundle (App Hosting / Cloud Run).
  serverExternalPackages: ["sharp", "firebase-admin"],
};

export default nextConfig;
