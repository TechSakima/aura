import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const sharpNativeGlobs = [
  "./node_modules/@img/sharp-libvips-linux-x64/**/*",
  "./node_modules/@img/sharp-linux-x64/**/*",
  "./node_modules/@img/sharp-libvips-linuxmusl-x64/**/*",
  "./node_modules/@img/sharp-linuxmusl-x64/**/*",
];

const nextConfig: NextConfig = {
  // Keep native / heavy server deps out of the App Hosting server bundle.
  serverExternalPackages: ["sharp", "firebase-admin", "stripe"],
  // sharp 0.34+/0.35 loads libvips via dlopen from a sibling package; NFT
  // often misses the .so files unless we force-include them.
  outputFileTracingIncludes: {
    "/*": sharpNativeGlobs,
    "/api/**/*": sharpNativeGlobs,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders(),
      },
    ];
  },
};

export default nextConfig;
