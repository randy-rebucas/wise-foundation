import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isDev = process.env.NODE_ENV === "development";

/** React / Turbopack use eval() in dev only; omit unsafe-eval in production CSP. */
const scriptSrc = ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])].join(" ");

function buildSecurityHeaders() {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-XSS-Protection", value: "1; mode=block" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    {
      key: "Content-Security-Policy",
      value: [
        "default-src 'self'",
        `script-src ${scriptSrc}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
      ].join("; "),
    },
  ];
}

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["pdfkit"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/marketplace", destination: "/", permanent: true },
      { source: "/marketplace/:path+", destination: "/:path+", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders(),
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  // Source maps are only uploaded when SENTRY_AUTH_TOKEN is set (CI/CD only)
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: false,
  },
});
