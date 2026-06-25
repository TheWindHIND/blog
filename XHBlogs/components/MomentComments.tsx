"use client";
import { useEffect, useRef } from 'react';
import { siteConfig } from '../siteConfig';

interface MomentCommentsProps {
  id: string; // 必须传入说说的专属 ID
}

export default function MomentComments({ id }: MomentCommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 清空重载，防止 React 严格模式下重复渲染
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
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', id);
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '0');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', 'preferred_color_scheme');
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('data-loading', 'lazy');

    containerRef.current.appendChild(script);
  }, [id]);

  return (
    <div className="w-full relative">
      <div ref={containerRef} className="moment-giscus" />
      
      {/* 🌟 说说评论极简风格 */}
      <style jsx global>{`
        .moment-giscus {
          font-size: 13px;
        }
        
        /* 调整 Giscus 内部间距 */
        .moment-giscus .gsc-main {
          margin: 0 !important;
        }
        
        .moment-giscus .gsc-comments {
          padding-top: 0 !important;
        }
        
        .moment-giscus .gsc-comment {
          padding: 8px 0 !important;
          border-top: 1px solid rgba(0, 0, 0, 0.05) !important;
        }
        
        .dark .moment-giscus .gsc-comment {
          border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
        }
        
        .moment-giscus .gsc-comment:first-child {
          border-top: none !important;
        }
        
        /* 头像缩小 */
        .moment-giscus .gsc-avatar {
          width: 24px !important;
          height: 24px !important;
        }
        
        .moment-giscus .gsc-avatar img {
          border-radius: 4px !important;
        }
        
        /* 用户名 */
        .moment-giscus .gsc-username {
          font-size: 13px !important;
          font-weight: bold !important;
          color: #576b95 !important;
        }
        
        .dark .moment-giscus .gsc-username {
          color: #7f99cc !important;
        }
        
        /* 评论正文 */
        .moment-giscus .gsc-comment-body {
          font-size: 13px !important;
        }
      `}</style>
    </div>
  );
}
