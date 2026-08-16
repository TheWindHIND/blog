# XHBlogs 性能优化计划

## 当前状态诊断

### 构建产物分析

| 指标 | 当前值 | 问题等级 |
|------|--------|----------|
| `out/` 总大小 | **145 MB** | 🔴 严重 |
| JS 总大小 | **2.24 MB** (未压缩) | 🟡 中等 |
| CSS 总大小 | **457 KB** (未压缩) | 🟡 中等 |
| 字体文件 | **7.4 MB** (172个 woff2/woff/ttf) | 🟡 中等 |
| 音乐文件 | **54 MB** (7首 MP3) | 🔴 严重 |
| 大图片 | **7.7 MB** (recreation-fg/bg.png) | 🟡 中等 |
| HTML 页面 | 16个 | ✅ 正常 |

### 性能瓶颈排序（按影响大小）

| # | 瓶颈 | 影响 | 根因 |
|---|------|------|------|
| 1 | **Three.js 全量打包** | 首屏 JS +350KB | `three` (38MB node_modules) 被打入共享 chunk，但仅 `app/tree/` 页面使用 |
| 2 | **未使用的重型依赖** | JS +200KB | `openai` (15MB)、`@tiptap` (8.6MB) 在前台 XHBlogs 中零引用但仍打包 |
| 3 | **背景图全量 preload** | 首屏阻塞 | 6张远程背景图全部 `<link rel="preload">`，总计数 MB |
| 4 | **无 gzip/brotli 压缩** | 传输体积 3x | GitHub Pages 不支持服务端压缩，Next.js 未配置静态预压缩 |
| 5 | **图片未优化** | 7.7MB PNG | `recreation-fg.png` (4.4MB)、`recreation-bg.png` (3.2MB) 未转 webp |
| 6 | **字体文件过多** | 7.4MB / 172个 | Google Fonts 本地化后保留了所有字重/子集 |
| 7 | **音乐文件内嵌** | 54MB | 7首 MP3 直接放在 out/ 中随站点部署 |
| 8 | **CSS 未 purge** | 457KB | Tailwind v4 + postcss 模式，无显式 content 配置 |
| 9 | **无代码分割** | tree 页面 Three.js 影响全站 | `next/dynamic` 未使用，所有页面共享大 chunk |

---

## 分阶段实施计划

### Phase 1：快速见效（预计 1-2 小时）

**目标**：减少首屏加载 50%+，不改业务逻辑

#### 1.1 移除未使用的依赖
```
XHBlogs/package.json 中删除：
- openai (15MB, 零引用)
- @tiptap/* (8.6MB, 零引用，仅管理端使用)
- @giscus/react (零引用)
- gitalk (零引用)
```
**预期效果**：JS chunk 减少 ~200KB，node_modules 减少 ~30MB

#### 1.2 Three.js 动态导入
```tsx
// app/tree/page.tsx — 用 next/dynamic 懒加载
import dynamic from 'next/dynamic';
const DijiangModel = dynamic(() => import('./DijiangModel'), {
  loading: () => <div className="h-96 flex items-center justify-center">加载 3D 模型中...</div>,
  ssr: false,
});
```
**预期效果**：tree 页面 JS 从共享 chunk 分离，首页加载减少 ~350KB

#### 1.3 背景图预加载优化
```tsx
// components/BackgroundSlider.tsx
// 当前：6张图全部 preload → 改为：仅 preload 当前显示的1张
// 移除 layout.tsx 中的 <link rel="preload"> 标签
// 改用 next/image 的 priority 属性仅对首张图
```
**预期效果**：首屏请求数从 6 降到 1，减少 ~5MB 首屏阻塞

#### 1.4 大图片转 WebP
```bash
# recreation-fg.png (4.4MB) → recreation-fg.webp (~400KB)
# recreation-bg.png (3.2MB) → recreation-bg.webp (~300KB)
# 使用 sharp 或 cwebp 转换
```
**预期效果**：图片体积减少 90%（7.7MB → ~0.7MB）

---

### Phase 2：传输优化（预计 1-2 小时）

**目标**：减少网络传输体积 60%+

#### 2.1 静态资源预压缩（gzip + brotli）
```js
// next.config.ts
import CompressionPlugin from 'compression-webpack-plugin';
import BrotliPlugin from 'brotli-webpack-plugin';

const nextConfig = {
  // ...existing config
  compress: false, // 禁用 Next.js 内置压缩（GitHub Pages 不支持）
  webpack: (config) => {
    config.plugins.push(
      new CompressionPlugin({ algorithm: 'gzip', test: /\.(js|css|html|svg)$/ }),
      new BrotliPlugin({ test: /\.(js|css|html|svg)$/ })
    );
    return config;
  },
};
```
**预期效果**：JS 2.24MB → ~700KB (gzip) / ~550KB (brotli)；CSS 457KB → ~80KB

> ⚠️ 注意：GitHub Pages 支持 `.gz` 文件的自动服务（同名 .gz 文件优先），但不支持 `.br`。
> 如果部署到 Cloudflare Pages 或 Vercel 则两者都支持。

#### 2.2 字体子集化
```tsx
// 当前 Noto_Serif_SC 加载了 400/700/900 三个字重
// 优化：仅保留 400 和 700，900 极少使用
const notoSerif = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "700"], // 移除 "900"
  variable: "--font-serif",
  display: 'swap',
});
```
同时清理 `out/_next/static/media/` 中未使用的字体变体文件。
**预期效果**：字体从 7.4MB 降至 ~4MB

#### 2.3 CSS 按需加载
```tsx
// highlight.js 的 CSS 在 layout.tsx 全局引入
// 改为仅在文章详情页引入：
// app/posts/[slug]/page.tsx 和 app/chatter/[slug]/page.tsx
import 'highlight.js/styles/atom-one-dark.css';
// 从 app/layout.tsx 中移除

// katex 同理，仅在使用数学公式的页面引入
```
**预期效果**：首页 CSS 减少 ~50KB

---

### Phase 3：架构优化（预计 2-3 小时）

**目标**：优化加载策略，提升交互体验

#### 3.1 首屏关键路径优化
```tsx
// app/layout.tsx — 将非首屏组件改为懒加载
import dynamic from 'next/dynamic';

const FloatingPlayer = dynamic(() => import('../components/FloatingPlayer'), { ssr: false });
const ClickEffect = dynamic(() => import('../components/ClickEffect'), { ssr: false });
const GlobalToolbox = dynamic(() => import('../components/GlobalToolbox'), { ssr: false });
const CyberCat = dynamic(() => import('../components/CyberCat'), { ssr: false });
const VisitorCounter = dynamic(() => import('../components/VisitorCounter'), { ssr: false });
const DanmakuBackground = dynamic(() => import('../components/DanmakuBackground'), { ssr: false });
```
**预期效果**：首屏 JS 减少 ~100KB，TTI 提升 200-500ms

#### 3.2 音乐文件外置
```
方案A（推荐）：音乐文件不放入 out/，改用 CDN 或外部链接
- 从 out/music/ 删除 7 首 MP3 (54MB)
- siteConfig.localMusic 改为指向外部 URL
- 保留 fetch-music.js 的逻辑但输出为 URL 列表

方案B：音乐文件按需加载
- 仅当用户点击播放时才 fetch 音频
- 使用 Web Audio API 流式播放
```
**预期效果**：out/ 从 145MB 降至 ~90MB，gh-pages 推送速度提升 50%

#### 3.3 图片懒加载
```tsx
// 照片墙、文章封面等使用原生 loading="lazy"
<img src={cover} loading="lazy" decoding="async" />

// 或使用 IntersectionObserver 实现更精确的懒加载
```
**预期效果**：首屏图片请求数减少 60%

---

### Phase 4：进阶优化（可选，预计 2-3 小时）

**目标**：达到 Lighthouse 90+ 分

#### 4.1 Service Worker 缓存
```tsx
// 注册 Service Worker 缓存静态资源
// next.config.ts 中启用 PWA 支持
```

#### 4.2 预渲染优化
```tsx
// 对高频访问页面（首页、文章列表）启用 ISR
// GitHub Pages 不支持 ISR，但可以在构建时生成更优化的静态页面
```

#### 4.3 Tree Shaking 审计
```bash
# 使用 @next/bundle-analyzer 分析 chunk 内容
ANALYZE=true npm run build
```
检查是否有重复依赖或未 tree-shake 的模块。

---

## 预期总体效果

| 指标 | 当前 | Phase 1 后 | Phase 2 后 | Phase 3 后 |
|------|------|-----------|-----------|-----------|
| 首屏 JS | ~1.5 MB | ~1.0 MB | ~350 KB (gzip) | ~250 KB (gzip) |
| 首屏 CSS | ~457 KB | ~407 KB | ~70 KB (gzip) | ~50 KB (gzip) |
| 首屏图片 | ~5 MB (preload) | ~500 KB | ~500 KB | ~200 KB (lazy) |
| out/ 大小 | 145 MB | ~110 MB | ~110 MB | ~55 MB |
| 首屏加载 (4G) | ~8-12s | ~4-5s | ~2-3s | ~1.5-2s |
| Lighthouse | ~40-50 | ~60-70 | ~75-85 | ~90+ |

---

## 实施建议

1. **Phase 1 必须做**——投入产出比最高，纯删减操作风险最低
2. **Phase 2 建议做**——压缩对 GitHub Pages 效果显著
3. **Phase 3 按需做**——懒加载改动较大，需回归测试
4. **Phase 4 视情况**——如果流量不大，优先级较低

**每完成一个 Phase 都应**：
1. 运行 `next build` 验证构建成功
2. 用 `npx serve out` 本地预览
3. 检查关键页面功能正常
4. 提交到 GitHub 并部署
