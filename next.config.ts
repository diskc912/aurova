import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            // "credentialless" is the modern alternative to "require-corp".
            // It keeps self.crossOriginIsolated = true (so SharedArrayBuffer
            // works for FFmpeg multi-threading) while allowing third-party
            // scripts like the Cashfree SDK to load without needing their
            // own Cross-Origin-Resource-Policy header.
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
