import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "out",
  basePath: "/ui",
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Development proxy configuration
  async rewrites() {
    return [
      {
        // API requests to Go backend
        source: "/api/:path*",
        destination: "http://localhost:8080/api/:path*",
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
