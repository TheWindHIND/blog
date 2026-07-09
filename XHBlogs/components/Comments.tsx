"use client";
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
// 🌟 引入全局配置
import { siteConfig } from '../siteConfig';
import { useTheme } from './ThemeProvider';

export default function Comments() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { isDark } = useTheme();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // 获取 Giscus 主题
  const getGiscusTheme = () => {
    return isDark ? 'dark' : 'light';
  };

  useEffect(() => {
    if (!containerRef.current) return;
    
    // 清空之前的评论区（防止 Next.js 路由切换时重复渲染）
    containerRef.current.innerHTML = '';
    
    // 动态加载 Giscus 脚本
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    // Giscus 配置
    script.setAttribute('data-repo', siteConfig.giscusConfig.repo);
    script.setAttribute('data-repo-id', siteConfig.giscusConfig.repoId);
    script.setAttribute('data-category', siteConfig.giscusConfig.category);
    script.setAttribute('data-category-id', siteConfig.giscusConfig.categoryId);
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', getGiscusTheme());
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('data-loading', 'lazy');
    
    // 监听 Giscus 加载完成，保存 iframe 引用
    const handleLoad = () => {
      const iframe = containerRef.current?.querySelector('iframe.giscus-frame');
      if (iframe) {
        iframeRef.current = iframe as HTMLIFrameElement;
      }
    };
    
    script.addEventListener('load', handleLoad);
    containerRef.current.appendChild(script);
    
    // 👇 擦除 URL 中的 OAuth 凭证，防止注销后二次登录失败
    const url = new URL(window.location.href);
    if (url.searchParams.has('code')) {
      url.searchParams.delete('code');
      window.history.replaceState({}, document.title, url.toString());
    }
    
    return () => {
      script.removeEventListener('load', handleLoad);
    };
  }, [pathname]);

  // 监听主题变化，动态切换 Giscus 主题
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({
        setConfig: {
          theme: getGiscusTheme(),
        }
      }, 'https://giscus.app');
    }
  }, [isDark]);

  return (
    <div className="w-full mt-16 relative">
      {/* 🌟 视觉特效：底部环境光晕 */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-indigo-500/10 dark:bg-indigo-500/20 blur-3xl rounded-full pointer-events-none z-0"></div>
      
      {/* 🌟 Giscus 容器：毛玻璃背景 */}
      <div className="relative z-10 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
        <div 
          ref={containerRef} 
          className="custom-giscus-glass"
        />
      </div>
      {/* 🌟 毛玻璃样式魔改 */}
      <style jsx global>{`
        .custom-giscus-glass {
          background: rgba(255, 255, 255, 0.35);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 32px;
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
        }
        
        /* 暗色模式 */
        .dark .custom-giscus-glass {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        
        /* Giscus 内部样式调整 */
        .giscus {
          width: 100%;
        }
        
        .giscus-frame {
          width: 100%;
          color-scheme: light dark;
          background: transparent !important;
        }
      `}</style>
    </div>
  );
}
