import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, MessageSquarePlus, Trash2, Cat, Sparkles } from 'lucide-react';
import { useToast } from '../ToastProvider';

interface DesktopPetSectionProps {
  formData: any;
  handleUpdate: (field: string, value: any) => void;
  pushToQueue: (label: string, key?: string, value?: any) => void;
}

export default function DesktopPetSection({ formData, handleUpdate, pushToQueue }: DesktopPetSectionProps) {
  const [newQuote, setNewQuote] = useState('');
  const [newClickReply, setNewClickReply] = useState('');
  const [activeTab, setActiveTab] = useState('random');
  const { showToast } = useToast();

  const petConfig = formData.desktopPetConfig || {};
  const randomQuotes: string[] = petConfig.randomQuotes || [];
  const clickReplies: string[] = petConfig.clickReplies || [];

  // 添加随机语录
  const handleAddQuote = () => {
    if (!newQuote.trim()) {
      showToast("语录内容不能为空哦", "warning");
      return;
    }
    const updatedQuotes = [...randomQuotes, newQuote.trim()];
    handleUpdate('desktopPetConfig', { ...petConfig, randomQuotes: updatedQuotes });
    setNewQuote('');
    showToast("语录已添加", "success");
  };

  // 删除随机语录
  const handleRemoveQuote = (indexToRemove: number) => {
    const updatedQuotes = randomQuotes.filter((_, index) => index !== indexToRemove);
    handleUpdate('desktopPetConfig', { ...petConfig, randomQuotes: updatedQuotes });
    showToast("语录已移除", "success");
  };

  // 添加点击回复
  const handleAddClickReply = () => {
    if (!newClickReply.trim()) {
      showToast("回复内容不能为空哦", "warning");
      return;
    }
    const updatedReplies = [...clickReplies, newClickReply.trim()];
    handleUpdate('desktopPetConfig', { ...petConfig, clickReplies: updatedReplies });
    setNewClickReply('');
    showToast("回复已添加", "success");
  };

  // 删除点击回复
  const handleRemoveClickReply = (indexToRemove: number) => {
    const updatedReplies = clickReplies.filter((_, index) => index !== indexToRemove);
    handleUpdate('desktopPetConfig', { ...petConfig, clickReplies: updatedReplies });
    showToast("回复已移除", "success");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: 'quote' | 'reply') => {
    if (e.key === 'Enter') {
      if (type === 'quote') handleAddQuote();
      else handleAddClickReply();
    }
  };

  const saveToQueue = () => {
    pushToQueue('桌宠语录配置', 'desktopPetConfig', petConfig);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-6"
    >
      <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/50 dark:border-slate-800/50 rounded-[40px] p-8 shadow-xl">
        <div className="flex justify-between items-center mb-8 border-b border-white/30 dark:border-slate-700/50 pb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Cat className="text-purple-500" /> 桌宠语录配置
            </h2>
            <p className="text-slate-500 text-sm mt-1 font-bold">自定义右下角桌宠的说话内容</p>
          </div>
          <button
            onClick={saveToQueue}
            className="px-6 py-3 bg-purple-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-purple-500/30 flex items-center gap-2 hover:bg-purple-600 transition-colors"
          >
            <Save size={16} /> 保存修改
          </button>
        </div>

        {/* 标签切换 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('random')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'random'
                ? 'bg-purple-500 text-white shadow-lg'
                : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-white/70'
            }`}
          >
            <Sparkles size={14} className="inline mr-1" /> 随机语录
          </button>
          <button
            onClick={() => setActiveTab('click')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'click'
                ? 'bg-purple-500 text-white shadow-lg'
                : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-white/70'
            }`}
          >
            <MessageSquarePlus size={14} className="inline mr-1" /> 点击回复
          </button>
        </div>

        {/* 随机语录 */}
        {activeTab === 'random' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="relative flex items-center gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Sparkles size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  value={newQuote}
                  onChange={(e) => setNewQuote(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'quote')}
                  className="w-full bg-white/60 dark:bg-slate-800/60 rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-purple-500 text-sm font-bold text-slate-700 dark:text-slate-200 border border-white/40 dark:border-slate-700/50 shadow-inner placeholder:text-slate-400"
                  placeholder="输入桌宠随机说的话，回车添加..."
                />
              </div>
              <button
                onClick={handleAddQuote}
                className="h-full px-6 py-4 bg-slate-800 dark:bg-slate-700 text-white rounded-2xl font-black text-sm hover:scale-105 transition-transform whitespace-nowrap shadow-md"
              >
                添加!
              </button>
            </div>

            <div className="bg-slate-100/50 dark:bg-slate-950/30 rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/50 min-h-[300px]">
              {randomQuotes.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 opacity-60 pt-10">
                  <Cat size={48} className="mb-4" />
                  <p className="font-bold text-sm">还没有语录，快去添加一些吧！</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <AnimatePresence>
                    {randomQuotes.map((text, index) => (
                      <motion.div
                        key={`quote-${index}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
                        className="group flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
                      >
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {text}
                        </span>
                        <button
                          onClick={() => handleRemoveQuote(index)}
                          className="w-6 h-6 flex items-center justify-center rounded-md bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all ml-1"
                          title="删除这条语录"
                        >
                          <Trash2 size={12} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* 点击回复 */}
        {activeTab === 'click' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="relative flex items-center gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <MessageSquarePlus size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  value={newClickReply}
                  onChange={(e) => setNewClickReply(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'reply')}
                  className="w-full bg-white/60 dark:bg-slate-800/60 rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-purple-500 text-sm font-bold text-slate-700 dark:text-slate-200 border border-white/40 dark:border-slate-700/50 shadow-inner placeholder:text-slate-400"
                  placeholder="输入点击桌宠时的回复，回车添加..."
                />
              </div>
              <button
                onClick={handleAddClickReply}
                className="h-full px-6 py-4 bg-slate-800 dark:bg-slate-700 text-white rounded-2xl font-black text-sm hover:scale-105 transition-transform whitespace-nowrap shadow-md"
              >
                添加!
              </button>
            </div>

            <div className="bg-slate-100/50 dark:bg-slate-950/30 rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/50 min-h-[300px]">
              {clickReplies.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 opacity-60 pt-10">
                  <Cat size={48} className="mb-4" />
                  <p className="font-bold text-sm">还没有点击回复，快去添加一些吧！</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <AnimatePresence>
                    {clickReplies.map((text, index) => (
                      <motion.div
                        key={`reply-${index}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
                        className="group flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
                      >
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {text}
                        </span>
                        <button
                          onClick={() => handleRemoveClickReply(index)}
                          className="w-6 h-6 flex items-center justify-center rounded-md bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all ml-1"
                          title="删除这条回复"
                        >
                          <Trash2 size={12} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* 提示 */}
        <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl">
          <p className="text-xs font-bold text-purple-600 dark:text-purple-400">
            💡 小提示：随机语录是桌宠待机时随机说的话，点击回复是点击桌宠时的回复。修改后记得点「保存修改」，然后同步到博客前端哦~
          </p>
        </div>
      </div>
    </motion.section>
  );
}
