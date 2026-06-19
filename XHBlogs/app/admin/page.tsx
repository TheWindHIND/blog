"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, FileText, Image, MessageSquare, 
  Users, Calendar, Shield, Terminal, 
  ChevronRight, Lock, Unlock, AlertTriangle
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';
import { siteConfig } from '../../siteConfig';

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState('dashboard');

  // 计算建站天数
  const buildDate = new Date(siteConfig.buildDate || '2026-06-20');
  const today = new Date();
  const daysDiff = Math.floor((today - buildDate) / (1000 * 60 * 60 * 24)) + 1; // +1 因为当天算第1天

  const menuItems = [
    { id: 'dashboard', name: '控制台', icon: Settings },
    { id: 'posts', name: '文章管理', icon: FileText },
    { id: 'moments', name: '说说管理', icon: MessageSquare },
    { id: 'chatters', name: '杂谈管理', icon: MessageSquare },
    { id: 'photos', name: '照片墙', icon: Image },
    { id: 'friends', name: '友链管理', icon: Users },
    { id: 'projects', name: '项目管理', icon: Terminal },
    { id: 'settings', name: '系统设置', icon: Shield },
  ];

  return (
    <div className="min-h-screen relative pb-20">
      <Navbar />
      <PageTransition>
        <main className="w-[95%] md:w-[90%] max-w-6xl mx-auto mt-24 md:mt-28 relative z-10">
          
          {/* 欢迎横幅 */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-8 md:p-12 text-white mb-8 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <Shield size={32} />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black">后台管理系统</h1>
                  <p className="text-white/80 font-medium">欢迎回来，管理员</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 mt-6">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4">
                  <div className="text-2xl font-black">3</div>
                  <div className="text-sm text-white/80">文章</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4">
                  <div className="text-2xl font-black">0</div>
                  <div className="text-sm text-white/80">说说</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4">
                  <div className="text-2xl font-black">1</div>
                  <div className="text-sm text-white/80">杂谈</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4">
                  <div className="text-2xl font-black">0</div>
                  <div className="text-sm text-white/80">友链</div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* 侧边栏 */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="w-full md:w-64 shrink-0"
            >
              <div className="bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl rounded-3xl p-4 shadow-xl border border-white/40 dark:border-white/10">
                {menuItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all duration-300 mb-1 ${
                        activeSection === item.id
                          ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <Icon size={20} />
                      <span>{item.name}</span>
                      <ChevronRight size={16} className="ml-auto opacity-50" />
                    </button>
                  );
                })}
              </div>

              {/* 提示卡片 */}
              <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-3xl p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h3 className="font-black text-amber-800 dark:text-amber-300 text-sm mb-2">
                      网页版限制
                    </h3>
                    <p className="text-xs text-amber-700 dark:text-amber-400/80 leading-relaxed">
                      由于静态部署限制，网页版仅提供预览功能。
                      完整的内容编辑功能请使用本地桌面版后台管理系统。
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 主内容区 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex-1"
            >
              <div className="bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl border border-white/40 dark:border-white/10 min-h-[500px]">
                
                {activeSection === 'dashboard' && (
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-6">
                      控制台
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-800/30">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-blue-500 text-white rounded-xl">
                            <Calendar size={20} />
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-200">建站天数</span>
                        </div>
                        <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                          {daysDiff} 天
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-5 border border-green-100 dark:border-green-800/30">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-green-500 text-white rounded-xl">
                            <FileText size={20} />
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-200">总文章数</span>
                        </div>
                        <div className="text-3xl font-black text-green-600 dark:text-green-400">
                          3 篇
                        </div>
                      </div>
                    </div>

                    <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4">
                      快速开始
                    </h3>
                    
                    <div className="space-y-3">
                      {[
                        { step: 1, title: '配置网站信息', desc: '修改 siteConfig.ts 中的网站标题、作者名、头像等' },
                        { step: 2, title: '撰写第一篇文章', desc: '在 posts 目录下创建 .md 文件，使用 Markdown 格式' },
                        { step: 3, title: '配置 Gitalk 评论', desc: '创建 GitHub OAuth App，填写 clientID 和 clientSecret' },
                        { step: 4, title: '部署到 GitHub Pages', desc: '运行 npm run build，将 out 目录推送到 gh-pages 分支' },
                      ].map((item) => (
                        <div key={item.step} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors">
                          <div className="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center font-black shrink-0">
                            {item.step}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 dark:text-white">{item.title}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeSection === 'posts' && (
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-6">
                      文章管理
                    </h2>
                    <div className="text-center py-16 text-slate-400">
                      <FileText size={64} className="mx-auto mb-4 opacity-30" />
                      <p className="font-bold">文章列表</p>
                      <p className="text-sm mt-2">完整编辑功能请使用桌面版后台</p>
                    </div>
                  </div>
                )}

                {activeSection === 'moments' && (
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-6">
                      说说管理
                    </h2>
                    <div className="text-center py-16 text-slate-400">
                      <MessageSquare size={64} className="mx-auto mb-4 opacity-30" />
                      <p className="font-bold">说说列表</p>
                      <p className="text-sm mt-2">完整编辑功能请使用桌面版后台</p>
                    </div>
                  </div>
                )}

                {activeSection === 'chatters' && (
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-6">
                      杂谈管理
                    </h2>
                    <div className="text-center py-16 text-slate-400">
                      <MessageSquare size={64} className="mx-auto mb-4 opacity-30" />
                      <p className="font-bold">杂谈列表</p>
                      <p className="text-sm mt-2">完整编辑功能请使用桌面版后台</p>
                    </div>
                  </div>
                )}

                {activeSection === 'photos' && (
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-6">
                      照片墙
                    </h2>
                    <div className="text-center py-16 text-slate-400">
                      <Image size={64} className="mx-auto mb-4 opacity-30" />
                      <p className="font-bold">照片管理</p>
                      <p className="text-sm mt-2">完整编辑功能请使用桌面版后台</p>
                    </div>
                  </div>
                )}

                {activeSection === 'friends' && (
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-6">
                      友链管理
                    </h2>
                    <div className="text-center py-16 text-slate-400">
                      <Users size={64} className="mx-auto mb-4 opacity-30" />
                      <p className="font-bold">友链列表</p>
                      <p className="text-sm mt-2">完整编辑功能请使用桌面版后台</p>
                    </div>
                  </div>
                )}

                {activeSection === 'projects' && (
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-6">
                      项目管理
                    </h2>
                    <div className="text-center py-16 text-slate-400">
                      <Terminal size={64} className="mx-auto mb-4 opacity-30" />
                      <p className="font-bold">项目列表</p>
                      <p className="text-sm mt-2">完整编辑功能请使用桌面版后台</p>
                    </div>
                  </div>
                )}

                {activeSection === 'settings' && (
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-6">
                      系统设置
                    </h2>
                    
                    <div className="space-y-4">
                      <div className="p-5 bg-slate-50 dark:bg-slate-900/30 rounded-2xl">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-2">配置文件位置</h3>
                        <code className="text-sm bg-slate-200 dark:bg-slate-800 px-3 py-1.5 rounded-lg font-mono text-indigo-600 dark:text-indigo-400">
                          XHBlogs/siteConfig.ts
                        </code>
                      </div>

                      <div className="p-5 bg-slate-50 dark:bg-slate-900/30 rounded-2xl">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-2">文章目录</h3>
                        <code className="text-sm bg-slate-200 dark:bg-slate-800 px-3 py-1.5 rounded-lg font-mono text-indigo-600 dark:text-indigo-400">
                          XHBlogs/posts/
                        </code>
                      </div>

                      <div className="p-5 bg-slate-50 dark:bg-slate-900/30 rounded-2xl">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-2">构建命令</h3>
                        <code className="text-sm bg-slate-200 dark:bg-slate-800 px-3 py-1.5 rounded-lg font-mono text-indigo-600 dark:text-indigo-400">
                          npm run build
                        </code>
                      </div>

                      <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Unlock size={18} className="text-emerald-500" />
                          <h3 className="font-bold text-emerald-800 dark:text-emerald-300">彩蛋已解锁</h3>
                        </div>
                        <p className="text-sm text-emerald-700 dark:text-emerald-400/80">
                          恭喜你发现了这个隐藏的后台管理页面！🎉
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </div>

        </main>
      </PageTransition>
    </div>
  );
}
