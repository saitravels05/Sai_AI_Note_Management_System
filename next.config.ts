import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self';",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval';", // Required for Next.js Fast Refresh & hydration
      "style-src 'self' 'unsafe-inline';",
      "img-src 'self' data: blob: https:;",
      "font-src 'self' data:;",
      "connect-src 'self' https://generativelanguage.googleapis.com;",
      "frame-ancestors 'none';",
      "form-action 'self';",
      "base-uri 'self';",
    ]
      .join(" ")
      .replace(/\s{2,}/g, " ")
      .trim(),
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "embedded-postgres"],
  poweredByHeader: false, // Disables X-Powered-By: Next.js header (prevents server fingerprinting)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
