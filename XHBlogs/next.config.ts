import type { NextConfig } from "next";
import CompressionPlugin from "compression-webpack-plugin";

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
  // 🌟 性能优化：构建时生成 .gz 预压缩文件
  // GitHub Pages 支持同名 .gz 文件自动服务（浏览器请求 foo.js → 服务端优先返回 foo.js.gz）
  compress: false, // 禁用 Next.js 内置运行时压缩（静态站点不需要）
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new CompressionPlugin({
          algorithm: 'gzip',
          test: /\.(js|css|html|svg|json)$/,
          threshold: 1024,    // 仅压缩 >1KB 的文件
          minRatio: 0.8,      // 压缩率 <80% 才生成 .gz
        })
      );
    }
    return config;
  },
};

export default nextConfig;
