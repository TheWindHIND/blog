"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { siteConfig } from '../siteConfig';

export default function CyberCat() {
  const [isPetted, setIsPetted] = useState(false);
  const [speech, setSpeech] = useState<string | null>(null);

  const chatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 从 desktopPetConfig 读取预设语句
  const petConfig = siteConfig.desktopPetConfig;
  const petName = petConfig?.petName || '煤球';
  const petImage = petConfig?.petImage || '/siamese-cat.png';
  const randomQuotes: string[] = petConfig?.randomQuotes || [
    "喵呜~ 今天天气真不错喵~",
    "好困哦，想睡觉喵...",
    "铲屎官，快去敲代码！",
    "我的小鱼干藏哪里去了？",
    "怎么没人理本喵...",
  ];
  const clickReplies: string[] = petConfig?.clickReplies || [
    "呼噜噜... 摸得本喵很舒服喵~",
    "别碰我！...好吧，勉强让你摸一下",
    "哼，只有这一次哦！",
    "喵~ 你手好暖和...",
  ];

  // --- 💬 说话功能 ---
  const speak = (text: string, duration = 6000) => {
    setSpeech(text);
    if (chatTimeoutRef.current) clearTimeout(chatTimeoutRef.current);
    chatTimeoutRef.current = setTimeout(() => {
      setSpeech(null);
    }, duration);
  };

  // --- 🖱️ 点击桌宠：随机回复 ---
  const handlePetCat = () => {
    if (isPetted) return;
    setIsPetted(true);
    const reply = clickReplies[Math.floor(Math.random() * clickReplies.length)];
    speak(reply, 3000);
    setTimeout(() => setIsPetted(false), 3000);
  };

  // --- ⏳ 随机挂机语录 ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (!speech && Math.random() > 0.75) {
        const msg = randomQuotes[Math.floor(Math.random() * randomQuotes.length)];
        speak(msg, 5000);
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [speech]);

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.1}
      whileDrag={{ scale: 1.1, cursor: "grabbing" }}
      className="fixed bottom-20 right-20 z-[9999] flex flex-col items-center group cursor-grab active:cursor-grabbing"
    >
      {/* 💬 语录气泡 */}
      <div className="relative w-full flex justify-center mb-6">
        <AnimatePresence>
          {speech && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="absolute bottom-0 bg-white dark:bg-slate-800 text-slate-700 dark:text-gray-200 px-4 py-3 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 text-sm max-w-[260px] break-words text-center leading-relaxed"
              style={{ pointerEvents: 'none', transformOrigin: 'bottom center' }}
            >
              {speech}
              <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-800 border-b border-r border-gray-100 dark:border-slate-700 transform rotate-45"></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 🐈 桌宠本体 */}
      <div className="relative">
        {/* 猫咪图片容器 */}
        <div
          className="w-[120px] h-[120px] relative cursor-pointer"
          onClick={handlePetCat}
        >
          <style>{`
            .cat-sprite {
              width: 100%;
              height: 100%;
              background-image: url('${petImage}');
              background-size: 300% 300%;
              background-repeat: no-repeat;
              image-rendering: pixelated;
            }
            .cat-idle {
              animation: idle-frames 1.2s infinite;
              background-position-y: 0%;
            }
            .cat-petted {
              animation: pet-frames 0.8s infinite;
              background-position-y: 50%;
            }
            @keyframes idle-frames {
              0%, 33.32% { background-position-x: 0%; }
              33.33%, 66.65% { background-position-x: 50%; }
              66.66%, 100% { background-position-x: 100%; }
            }
            @keyframes pet-frames {
              0%, 49.99% { background-position-x: 0%; }
              50%, 100% { background-position-x: 50%; }
            }
          `}</style>
          <div className={`cat-sprite drop-shadow-2xl ${isPetted ? 'cat-petted' : 'cat-idle'}`} />
        </div>
      </div>
    </motion.div>
  );
}
