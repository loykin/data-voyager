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
  // Transpile shared workspace packages
  transpilePackages: ["@data-voyager/shared-ui"],
  // Webpack configuration for shared packages
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@/lib/utils": require.resolve("../../shared/frontend/src/lib/utils.ts"),
    };
    return config;
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
