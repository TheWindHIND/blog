"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calculator } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SecretCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SecretCalculator({ isOpen, onClose }: SecretCalculatorProps) {
  const router = useRouter();
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [shake, setShake] = useState(false);

  // 密码：1233 + 2233 = 5233
  const TARGET_RESULT = 5233;
  const CONFIRM_PASSWORD = 'Aylen';

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clearAll = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operator) {
      const currentValue = previousValue || 0;
      let result = 0;

      switch (operator) {
        case '+':
          result = currentValue + inputValue;
          break;
        case '-':
          result = currentValue - inputValue;
          break;
        case '×':
          result = currentValue * inputValue;
          break;
        case '÷':
          result = currentValue / inputValue;
          break;
        default:
          result = inputValue;
      }

      setPreviousValue(result);
      setDisplay(String(result));
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const calculate = () => {
    if (operator === null || previousValue === null) return;

    const inputValue = parseFloat(display);
    let result = 0;

    switch (operator) {
      case '+':
        result = previousValue + inputValue;
        break;
      case '-':
        result = previousValue - inputValue;
        break;
      case '×':
        result = previousValue * inputValue;
        break;
      case '÷':
        result = previousValue / inputValue;
        break;
      default:
        result = inputValue;
    }

    setDisplay(String(result));
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(true);

    // 检查是否是目标结果
    if (Math.abs(result - TARGET_RESULT) < 0.001) {
      setTimeout(() => {
        setShowConfirmModal(true);
      }, 500);
    }
  };

  const handleConfirm = () => {
    if (confirmInput === CONFIRM_PASSWORD) {
      // 密码正确，跳转到后台管理页面
      router.push('/admin');
    } else {
      // 密码错误，抖动效果
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setConfirmInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9') {
      inputDigit(e.key);
    } else if (e.key === '.') {
      inputDecimal();
    } else if (e.key === '+' || e.key === '-') {
      performOperation(e.key);
    } else if (e.key === '*') {
      performOperation('×');
    } else if (e.key === '/') {
      e.preventDefault();
      performOperation('÷');
    } else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      calculate();
    } else if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Backspace') {
      setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
    }
  };

  useEffect(() => {
    if (isOpen) {
      clearAll();
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* 计算器 */}
          <motion.div
            initial={{ opacity: 0, x: -100, y: 100 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -100, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-8 left-8 z-50"
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-4 w-72">
              {/* 标题栏 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calculator size={16} />
                  <span className="text-xs font-bold">计算器</span>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 显示屏 */}
              <div className="bg-slate-800/80 rounded-2xl p-4 mb-4 text-right">
                <div className="text-slate-500 text-xs h-4">
                  {previousValue !== null && operator && `${previousValue} ${operator}`}
                </div>
                <div className="text-white text-3xl font-bold font-mono truncate">
                  {display}
                </div>
              </div>

              {/* 按钮 */}
              <div className="grid grid-cols-4 gap-2">
                {/* 第一行 */}
                <button
                  onClick={clearAll}
                  className="bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-3 font-bold transition-colors"
                >
                  AC
                </button>
                <button
                  onClick={() => performOperation('÷')}
                  className="bg-orange-500 hover:bg-orange-400 text-white rounded-xl py-3 font-bold transition-colors"
                >
                  ÷
                </button>
                <button
                  onClick={() => performOperation('×')}
                  className="bg-orange-500 hover:bg-orange-400 text-white rounded-xl py-3 font-bold transition-colors"
                >
                  ×
                </button>
                <button
                  onClick={() => performOperation('-')}
                  className="bg-orange-500 hover:bg-orange-400 text-white rounded-xl py-3 font-bold transition-colors"
                >
                  −
                </button>

                {/* 第二行 */}
                <button
                  onClick={() => inputDigit('7')}
                  className="bg-slate-600 hover:bg-slate-500 text-white rounded-xl py-3 font-bold transition-colors"
                >
                  7
                </button>
                <button
                  onClick={() => inputDigit('8')}
                  className="bg-slate-600 hover:bg-slate-500 text-white rounded-xl py-3 font-bold transition-colors"
                >
                  8
                </button>
                <button
                  onClick={() => inputDigit('9')}
                  className="bg-slate-600 hover:bg-slate-500 text-white rounded-xl py-3 font-bold transition-colors"
                >
                  9
                </button>
                <button
                  onClick={() => performOperation('+')}
                  className="bg-orange-500 hover:bg-orange-400 text-white rounded-xl py-3 font-bold transition-colors row-span-2"
                  style={{ gridRow: 'span 2' }}
                >
                  +
                </button>

                {/* 第三行 */}
                <button
                  onClick={() => inputDigit('4')}
                  className="bg-slate-600 hover:bg-slate-500 text-white rounded-xl py-3 font-bold transition-colors"
                >
                  4
                </button>
                <button
                  onClick={() => inputDigit('5')}
                  className="bg-slate-600 hover:bg-slate-500 text-white rounded-xl py-3 font-bold transition-colors"
                >
                  5
                </button>
                <button
                  onClick={() => inputDigit('6')}
                  className="bg-slate-600 hover:bg-slate-500 text-white rounded-xl py-3 font-bold transition-colors"
                >
                  6
                </button>

                {/* 第四行 */}
                <button
                  onClick={() => inputDigit('1')}
                  className="bg-slate-600 hover:bg-slate-500 text-white rounded-xl py-3 font-bold transition-colors"
                >
                  1
                </button>
                <button
                  onClick={() => inputDigit('2')}
                  className="bg-slate-600 hover:bg-slate-500 text-white rounded-xl py-3 font-bold transition-colors"
                >
                  2
                </button>
                <button
                  onClick={() => inputDigit('3')}
                  className="bg-slate-600 hover:bg-slate-500 text-white rounded-xl py-3 font-bold transition-colors"
                >
                  3
                </button>
                <button
                  onClick={calculate}
                  className="bg-green-500 hover:bg-green-400 text-white rounded-xl py-3 font-bold transition-colors row-span-2"
                  style={{ gridRow: 'span 2' }}
                >
                  =
                </button>

                {/* 第五行 */}
                <button
                  onClick={() => inputDigit('0')}
                  className="bg-slate-600 hover:bg-slate-500 text-white rounded-xl py-3 font-bold transition-colors col-span-2"
                  style={{ gridColumn: 'span 2' }}
                >
                  0
                </button>
                <button
                  onClick={inputDecimal}
                  className="bg-slate-600 hover:bg-slate-500 text-white rounded-xl py-3 font-bold transition-colors"
                >
                  .
                </button>
              </div>

              {/* 提示文字 */}
              <div className="mt-4 text-center text-slate-600 text-xs">
                提示：输入正确的算式有惊喜哦~
              </div>
            </div>
          </motion.div>

          {/* 确认弹窗 */}
          <AnimatePresence>
            {showConfirmModal && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed inset-0 flex items-center justify-center z-[60]"
              >
                <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setShowConfirmModal(false)} />
                <motion.div
                  animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className="relative bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-8 w-96"
                >
                  <h3 className="text-2xl font-black text-white mb-2 text-center">
                    🎉 恭喜你发现了彩蛋！
                  </h3>
                  <p className="text-slate-400 text-center mb-6">
                    请输入确认密码以进入后台管理系统
                  </p>

                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                    placeholder="请输入密码..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4 text-center font-bold tracking-widest"
                    autoFocus
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowConfirmModal(false)}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-3 font-bold transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleConfirm}
                      className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white rounded-xl py-3 font-bold transition-all shadow-lg shadow-indigo-500/30"
                    >
                      确认
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
