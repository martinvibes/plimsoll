import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // The hosted demo runs the self-contained server.
  output: "standalone",
  devIndicators: false,
};

export default config;
