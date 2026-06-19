import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🚨 核心修改 1：开启纯静态导出，用于 GitHub Pages 部署
  output: 'export',
  // 🚨 核心修改 2：静态部署需要强制加斜杠，避免路径匹配错误
  trailingSlash: true,
  // 🚨 核心修改 3：GitHub Pages 部署在子路径 /blog 下，需要配置 basePath
  basePath: '/blog',
  // 下面这些可以保留
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true, // 忽略 TS 错误，方便快速部署
  },
};

export default nextConfig;
