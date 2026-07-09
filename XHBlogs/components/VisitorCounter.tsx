"use client";
import { useEffect, useState } from 'react';

// 🌟 访客人数统计组件 - 使用不蒜子免费统计服务
// 右下角悬浮胶囊样式
export default function VisitorCounter() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 检查是否已经加载过
    if (document.getElementById('busuanzi-script')) {
      setIsLoaded(true);
      return;
    }

    // 动态加载不蒜子统计脚本
    const script = document.createElement('script');
    script.id = 'busuanzi-script';
    script.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
    script.async = true;
    
    script.onload = () => {
      setIsLoaded(true);
    };

    document.body.appendChild(script);

    return () => {
      // 不移除脚本，保留统计功能
    };
  }, []);

  return (
    <div className="fixed bottom-24 right-6 z-40 hidden md:block">
      <div className="
        inline-flex items-center gap-2 
        px-3 py-1.5 
        rounded-full 
        bg-white/30 dark:bg-slate-800/30 
        backdrop-blur-md 
        border border-white/40 dark:border-white/10
        shadow-lg
        text-xs
        text-slate-600 dark:text-slate-300
        transition-all duration-300
        hover:bg-white/40 dark:hover:bg-slate-700/40
        hover:scale-105
      ">
        <span className="text-sm">👥</span>
        <span 
          id="busuanzi_value_site_uv"
          className="font-medium text-indigo-600 dark:text-indigo-400"
        >
          {isLoaded ? '...' : '--'}
        </span>
      </div>
    </div>
  );
}
