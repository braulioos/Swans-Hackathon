import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Clio app's redirect URI uses 127.0.0.1, and Next's dev server only trusts localhost by default.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
