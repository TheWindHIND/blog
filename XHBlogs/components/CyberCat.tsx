"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { siteConfig } from '@/siteConfig';

export default function CyberCat() {
  const [isPetted, setIsPetted] = useState(false);
  const [speech, setSpeech] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 从配置读取桌宠设置（与控制中心同步的 desktopPetConfig）
  const petConfig = siteConfig.desktopPetConfig || {
    petName: "银狼",
    petImage: "/silver-wolf.png",
    randomQuotes: ["你好~"],
    clickReplies: ["别碰我~"],
    feedReply: "谢谢~",
    thinkingReply: "让我想想...",
    errorReply: "网络出问题了...",
    inputPlaceholder: "说点啥...",
  };

  // 处理图片路径（支持 basePath）
  const getImageSrc = () => {
    const img = petConfig.petImage || "/silver-wolf.png";
    if (img.startsWith('http')) {
      return img;
    }
    // 从页面路径中提取 basePath（兼容 GitHub Pages 子路径部署）
    let basePath = '';
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      // 尝试从路径中提取 basePath（假设部署在 /blog/ 下）
      if (pathname.startsWith('/blog')) {
        basePath = '/blog';
      }
    }
    if (img.startsWith('/')) {
      return basePath + img;
    }
    return basePath + '/' + img;
  };

  // --- 💬 说话功能 ---
  const speak = (text: string, duration = 6000) => {
    setSpeech(text);
    if (chatTimeoutRef.current) clearTimeout(chatTimeoutRef.current);
    chatTimeoutRef.current = setTimeout(() => {
      setSpeech(null);
    }, duration);
  };

  // --- 🖱️ 交互事件：点击桌宠 ---
  const handlePetCat = () => {
    if (isPetted) return;
    setIsPetted(true);
    const clickReplies = petConfig.clickReplies || ["别碰我~"];
    const randomLine = clickReplies[Math.floor(Math.random() * clickReplies.length)];
    speak(randomLine, 2500);
    setTimeout(() => {
      setIsPetted(false);
    }, 1500);
  };

  // --- 🎮 交互事件：投喂 ---
  const handleFeed = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isThinking) return;
    setShowInput(false);
    setIsThinking(true);
    speak(petConfig.feedReply || "谢谢~", 4000);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "我给了你一罐能量饮料！你有什么表示？" }),
      });
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      speak(data.reply, 8000);
    } catch (error) {
      speak(petConfig.errorReply || "... 网络有点卡", 4000);
    } finally {
      setIsThinking(false);
    }
  };

  // --- 💬 交互事件：发送聊天 ---
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isThinking) return;
    const userMessage = inputValue;
    setInputValue('');
    setShowInput(false);
    setIsThinking(true);
    speak(petConfig.thinkingReply || "让我想想...", 3000);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      speak(data.reply, 8000);
    } catch (error) {
      speak(petConfig.errorReply || "网络好像出问题了...", 4000);
    } finally {
      setIsThinking(false);
    }
  };

  // --- ⏳ 随机挂机语录 ---
  useEffect(() => {
    const randomQuotes = petConfig.randomQuotes || ["你好~"];
    const randomTalkInterval = setInterval(() => {
      if (!speech && !showInput && !isThinking && Math.random() > 0.75) {
        const randomMsg = randomQuotes[Math.floor(Math.random() * randomQuotes.length)];
        speak(randomMsg, 4500);
      }
    }, 18000);
    return () => clearInterval(randomTalkInterval);
  }, [speech, showInput, isThinking, petConfig.randomQuotes]);

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.1}
      whileDrag={{ scale: 1.1, cursor: "grabbing" }}
      className="fixed bottom-20 right-20 z-[9999] flex flex-col items-center group cursor-grab active:cursor-grabbing"
    >
      {/* 💬 聊天气泡 */}
      <div className="relative w-full flex justify-center mb-4">
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

      {/* 🐺 桌宠本体 & 交互按钮区 */}
      <div className="relative">
        {/* 左侧按钮 */}
        <div className="absolute -left-14 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
          {/* 💬 聊天按钮 */}
          <button
            onClick={(e) => {
               e.stopPropagation();
               setShowInput(!showInput);
            }}
            className="bg-white/90 dark:bg-slate-700/90 p-2.5 rounded-full shadow-md hover:scale-110 active:scale-95 transition-transform border border-gray-100 dark:border-slate-600 text-purple-500 hover:text-purple-600 flex items-center justify-center backdrop-blur-sm"
            title="聊天"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
            </svg>
          </button>
          {/* 🎮 投喂按钮 */}
          <button
            onClick={handleFeed}
            disabled={isThinking}
            className={`bg-white/90 dark:bg-slate-700/90 p-2.5 rounded-full shadow-md hover:scale-110 active:scale-95 transition-transform border border-gray-100 dark:border-slate-600 flex items-center justify-center backdrop-blur-sm ${isThinking ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="投喂能量饮料"
          >
            <span className="text-xl leading-none">🥤</span>
          </button>
        </div>

        {/* 桌宠图片容器 */}
        <div
          className="w-[140px] h-[100px] relative cursor-pointer"
          onClick={handlePetCat}
        >
          <style>{`
            .pet-img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
            }
            .pet-breathing {
              animation: pet-breathe 3s ease-in-out infinite;
            }
            .pet-petted {
              animation: pet-shake 0.5s ease-in-out;
            }
            .pet-thinking {
              animation: pet-breathe 1.5s ease-in-out infinite;
            }
            @keyframes pet-breathe {
              0%, 100% { transform: scale(1) translateY(0); }
              50% { transform: scale(1.03) translateY(-2px); }
            }
            @keyframes pet-shake {
              0%, 100% { transform: rotate(0deg); }
              25% { transform: rotate(-5deg) scale(1.05); }
              75% { transform: rotate(5deg) scale(1.05); }
            }
          `}</style>
          <img
            src={getImageSrc()}
            alt={petConfig.petName || "桌宠"}
            className={`pet-img ${isPetted ? 'pet-petted' : isThinking ? 'pet-thinking' : 'pet-breathing'}`}
          />
        </div>
      </div>

      {/* ⌨️ 互动输入框 */}
      <AnimatePresence>
        {showInput && (
          <motion.form
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            onSubmit={handleChatSubmit}
            className="absolute -bottom-14 bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-lg flex items-center border border-gray-200 dark:border-slate-700 w-60 z-20"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={petConfig.inputPlaceholder || "说点啥..."}
              className="bg-transparent border-none outline-none text-sm px-3 py-1 w-full dark:text-white placeholder-gray-400"
              disabled={isThinking}
              autoFocus
            />
            <button
              type="submit"
              disabled={isThinking || !inputValue.trim()}
              className={`rounded-full p-1.5 ml-1 flex items-center justify-center transition-colors ${
                isThinking || !inputValue.trim() ? 'bg-gray-300 text-gray-500' : 'bg-purple-500 hover:bg-purple-600 text-white'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
              </svg>
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
