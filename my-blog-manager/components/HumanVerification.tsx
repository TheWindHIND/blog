"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HumanVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function HumanVerification({ isOpen, onClose, onSuccess }: HumanVerificationProps) {
  const [inputValue, setInputValue] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'failed' | 'success'>('idle');

  // 打开时重置状态
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setVerificationStatus('idle');
    }
  }, [isOpen]);

  // 验证逻辑
  const handleVerify = () => {
    const correctAnswer = 0.1 + 0.2; // JavaScript 经典浮点数问题：0.30000000000000004
    const inputNum = parseFloat(inputValue);
    
    if (inputValue === '0.3' || inputValue === '.3') {
      setVerificationStatus('failed');
    } else if (!isNaN(inputNum) && Math.abs(inputNum - correctAnswer) < 0.000000000000001) {
      setVerificationStatus('success');
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1000);
      }
    } else if (inputValue.length > 0) {
      setVerificationStatus('failed');
    }
  };

  // 输入变化时重新验证
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (verificationStatus !== 'idle') {
      setVerificationStatus('idle');
    }
  };

  // 回车验证
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            {/* 弹窗 */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-white/20"
            >
              {/* 标题 */}
              <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                我们怀疑您是人类，请完成机器人验证：
              </h2>

              {/* 题目显示 */}
              <div className="bg-black rounded-xl p-6 mb-5 flex items-center justify-center overflow-hidden">
                <span 
                  className="text-green-400 font-mono text-4xl md:text-5xl font-bold tracking-wider"
                  style={{ textShadow: '0 0 10px rgba(74, 222, 128, 0.5)' }}
                >
                  0.1 + 0.2 = ?
                </span>
              </div>

              {/* 输入框 */}
              <div className="mb-4">
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="请输入答案..."
                  className="w-full px-4 py-3 text-lg bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors font-mono"
                />
              </div>

              {/* 验证状态 */}
              <div className="h-8 mb-5 flex items-center">
                {verificationStatus === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    您已通过验证，请继续
                  </motion.div>
                )}
                {verificationStatus === 'failed' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-red-500 dark:text-red-400 font-bold"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    验证未通过，您可能是人类
                  </motion.div>
                )}
              </div>

              {/* 按钮组 */}
              <div className="flex gap-3">
                {/* 取消按钮 */}
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-6 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 active:scale-95"
                >
                  取消
                </button>

                {/* 下一步按钮 */}
                <button
                  onClick={handleVerify}
                  disabled={verificationStatus !== 'success' && inputValue.length === 0}
                  className={`flex-1 py-3 px-6 rounded-xl font-bold text-white transition-all duration-200 active:scale-95 ${
                    verificationStatus === 'success'
                      ? 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30'
                      : inputValue.length === 0
                      ? 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed opacity-50'
                      : 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/30'
                  }`}
                >
                  {verificationStatus === 'success' ? '验证通过' : '下一步'}
                </button>
              </div>

              {/* 提示文字 */}
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-4">
                提示：这是一个 JavaScript 彩蛋 🐱
              </p>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
