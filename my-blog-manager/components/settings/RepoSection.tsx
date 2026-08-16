"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../ToastProvider';
import { ShieldCheck, Rocket, Key, Copy, Check, CloudUpload, RefreshCw, Save, TerminalSquare, GitBranch, Globe, FileCode } from 'lucide-react';

// 🌟 2026-08-16 对齐改造：本页面与「一键部署网站.bat」的执行逻辑完全一致
//   ① 同步内容 → ② next build → ③ out/ 推送 gh-pages → ④ 根仓库推送源码 main
//   不再需要手填物理路径，不再使用 Vercel 双轨（B线）流程

let _apiBase: string | null = null;
async function getApiBase(): Promise<string | null> {
  if (_apiBase) return _apiBase;
  try {
    const res = await fetch(`/backend_config.json?t=${Date.now()}`);
    const data = await res.json();
    if (data.api_port) {
      _apiBase = `http://127.0.0.1:${data.api_port}`;
      return _apiBase;
    }
  } catch { /* ignore */ }
  return null;
}

export default function RepoSection() {
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [blogInfo, setBlogInfo] = useState<any>(null);
  const [deployCfg, setDeployCfg] = useState({ staticRepoUrl: '', staticBranch: 'gh-pages', sourceBranch: 'main' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [sshKey, setSshKey] = useState('');
  const [showSSH, setShowSSH] = useState(false);
  const [confirmDeploy, setConfirmDeploy] = useState(false);
  const [deploySteps, setDeploySteps] = useState<any[]>([]);
  const [deployRunning, setDeployRunning] = useState(false);

  const loadInfo = async (silent = false) => {
    try {
      const apiBase = await getApiBase();
      if (!apiBase) throw new Error();
      const res = await fetch(`${apiBase}/api/deploy/blog_info`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setBlogInfo(data.data);
        setDeployCfg({
          staticRepoUrl: data.data.mainRemote || data.data.staticRepoUrl || '',
          staticBranch: data.data.staticBranch || 'gh-pages',
          sourceBranch: data.data.sourceBranch || 'main'
        });
      }
    } catch {
      if (!silent) showToast("无法连接后端引擎", "error");
    }
  };

  useEffect(() => { loadInfo(true); }, []);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const apiBase = await getApiBase();
      const res = await fetch(`${apiBase}/api/deploy/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...deployCfg, blogPath: blogInfo?.xhblogsPath || '' })
      });
      const data = await res.json();
      if (data.success) showToast(data.message, "success");
      else showToast(data.message || "保存失败", "error");
    } catch { showToast("保存失败", "error"); }
    setIsSaving(false);
  };

  // ① 仅同步内容（等价「一键同步内容.bat」）
  const handleSyncContent = async () => {
    setIsSyncing(true);
    showToast("📥 正在同步内容到 XHBlogs...", "info");
    try {
      const apiBase = await getApiBase();
      const res = await fetch(`${apiBase}/api/deploy/sync_content`, { method: 'POST' });
      const data = await res.json();
      showToast(data.success ? `✅ ${data.message}` : `❌ ${data.message}`, data.success ? "success" : "error");
    } catch { showToast("同步请求失败", "error"); }
    setIsSyncing(false);
  };

  // ② 完整部署（等价「一键部署网站.bat」：同步 → 构建 → gh-pages → 源码 main）
  const handleOneClick = async () => {
    setConfirmDeploy(false);
    setIsDeploying(true);
    setDeployRunning(true);
    setDeploySteps([{ name: '准备中', success: true, message: '已提交部署引擎，同步 → 构建 → 推送 gh-pages → 推送源码' }]);
    showToast("🚀 一键部署已启动：同步 → 构建 → 推送（需数分钟）...", "info");
    try {
      const apiBase = await getApiBase();
      const res = await fetch(`${apiBase}/api/deploy/one_click`, { method: 'POST' });
      const data = await res.json();
      setDeploySteps(data.steps || []);
      showToast(data.message || (data.success ? "部署成功" : "部署失败"), data.success ? "success" : "error");
    } catch {
      showToast("部署请求失败（可能仍在构建，请稍后查看 GitHub）", "error");
    }
    setIsDeploying(false);
    setDeployRunning(false);
  };

  const handleGetSSH = async () => {
    try {
      const apiBase = await getApiBase();
      const res = await fetch(`${apiBase}/api/deploy/ssh/key?type=static`);
      const data = await res.json();
      if (data.success) { setSshKey(data.key); setShowSSH(true); }
      else showToast(data.message, "error");
    } catch { showToast("获取 SSH 失败", "error"); }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sshKey);
    setIsCopied(true);
    showToast("已复制到剪贴板", "success");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const ok = (v: boolean) => v ? "✅" : "⚠️";

  return (
    <>
      <motion.section initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-slate-800/50 rounded-[40px] p-8 shadow-2xl relative z-10 space-y-8">

        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">🚀 一键部署 (GitHub Pages)</h2>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">与「一键部署网站.bat」完全对齐：同步 → 构建 → 推送 gh-pages → 推送源码</p>
          </div>
          <button onClick={() => loadInfo()} className="flex items-center gap-1 px-4 py-2 bg-slate-500/10 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black hover:bg-slate-500/20 transition-colors">
            <RefreshCw size={14} /> 刷新状态
          </button>
        </div>

        {/* 环境状态卡（自动探测，无需手填） */}
        <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/50 space-y-3">
          <p className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase flex items-center gap-1">
            <ShieldCheck size={14} className="text-indigo-500" /> 环境状态（自动探测）
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono text-slate-600 dark:text-slate-300">
            <div>{ok(blogInfo?.nodeOk)} Node.js {blogInfo ? '' : '检测中...'}</div>
            <div>{ok(blogInfo?.gitOk)} Git</div>
            <div>{ok(blogInfo?.xhblogsOk)} XHBlogs 前端项目</div>
            <div className="md:col-span-1 truncate" title={blogInfo?.xhblogsPath}>{blogInfo ? '📁' : '⏳'} {blogInfo?.xhblogsPath || 'H:\\Blog\\blog\\XHBlogs'}</div>
          </div>
        </div>

        {/* 部署目标配置（与 bat 中的仓库/分支一致） */}
        <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/50 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase flex items-center gap-1">
              <GitBranch size={14} className="text-emerald-500" /> 部署目标（gh-pages 静态页 + 源码 main 同仓库）
            </p>
            <button onClick={handleGetSSH} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black hover:bg-emerald-500 hover:text-white transition-all">
              <Key size={12} /> 获取 SSH 公钥
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><Globe size={11} /> Pages 仓库 (SSH)</label>
              <input type="text" value={deployCfg.staticRepoUrl} onChange={e => setDeployCfg({ ...deployCfg, staticRepoUrl: e.target.value })}
                className="w-full bg-white dark:bg-slate-900/50 border border-emerald-200/50 dark:border-emerald-700/50 rounded-xl px-4 py-2 text-xs mt-1 outline-none font-mono focus:ring-2 focus:ring-emerald-500" placeholder="git@github.com:user/repo.git" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><Globe size={11} /> 静态分支</label>
              <input type="text" value={deployCfg.staticBranch} onChange={e => setDeployCfg({ ...deployCfg, staticBranch: e.target.value })}
                className="w-full bg-white dark:bg-slate-900/50 border border-emerald-200/50 dark:border-emerald-700/50 rounded-xl px-4 py-2 text-xs mt-1 outline-none font-mono focus:ring-2 focus:ring-emerald-500" placeholder="gh-pages" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><FileCode size={11} /> 源码分支</label>
              <input type="text" value={deployCfg.sourceBranch} onChange={e => setDeployCfg({ ...deployCfg, sourceBranch: e.target.value })}
                className="w-full bg-white dark:bg-slate-900/50 border border-emerald-200/50 dark:border-emerald-700/50 rounded-xl px-4 py-2 text-xs mt-1 outline-none font-mono focus:ring-2 focus:ring-emerald-500" placeholder="main" />
            </div>
          </div>
          <button onClick={handleSaveConfig} disabled={isSaving} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-xs font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
            <Save size={14} /> {isSaving ? "正在保存..." : "保存部署配置"}
          </button>
        </div>

        {/* 操作区：与 bat 的两个入口对应 */}
        <div className="flex gap-3 flex-col md:flex-row">
          <button onClick={handleSyncContent} disabled={isSyncing || isDeploying}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-amber-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-amber-500/30 active:scale-95 transition-all hover:bg-amber-600 disabled:opacity-50">
            <CloudUpload size={18} className={isSyncing ? "animate-pulse" : ""} /> {isSyncing ? "同步中..." : "📥 仅同步内容"}
          </button>
          <button onClick={() => setConfirmDeploy(true)} disabled={isSyncing || isDeploying}
            className="flex-[2] flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-500/30 active:scale-95 transition-all hover:bg-emerald-600 disabled:opacity-50">
            <Rocket size={18} className={isDeploying ? "animate-bounce" : ""} /> {isDeploying ? "部署进行中..." : "🚀 一键部署网站"}
          </button>
        </div>

        {/* 部署步骤结果 */}
        {deploySteps.length > 0 && (
          <div className="bg-slate-900/95 rounded-3xl p-5 border border-white/10 space-y-2">
            <p className="text-[10px] font-black text-emerald-400 uppercase flex items-center gap-1.5">
              <TerminalSquare size={13} /> {deployRunning ? "部署日志（执行中）" : "部署日志"}
            </p>
            {deploySteps.map((s: any, i: number) => (
              <div key={i} className="text-xs font-mono">
                <span className={s.success ? "text-emerald-400" : "text-red-400"}>{s.success ? "✓" : "✗"} {s.name}</span>
                {!s.success && s.message && (
                  <pre className="mt-1 text-[10px] text-slate-400 whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">{s.message}</pre>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-slate-400 leading-relaxed">
          💡 「仅同步内容」= 一键同步内容.bat（同步后仍需构建才能上线）；「一键部署网站」= 一键部署网站.bat 全流程。
          部署地址：GitHub Pages 仓库的 gh-pages 分支，源码同步至 main 分支。
        </p>
      </motion.section>

      {/* SSH 公钥弹窗 */}
      {mounted && createPortal(
        <AnimatePresence>
          {showSSH && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSSH(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" />
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[40px] shadow-2xl border border-white/50 p-10 text-center">
                <div className="w-16 h-16 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6"><Key className="text-amber-500" size={32} /></div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">SSH 公钥已就绪</h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">请将此公钥添加到 GitHub 账号的 SSH Keys（Settings → SSH and GPG keys），用于 gh-pages 与源码推送。</p>
                <div className="relative group mb-8">
                  <div className="w-full bg-slate-900 dark:bg-black rounded-2xl p-4 text-[10px] font-mono text-emerald-400 text-left break-all h-32 overflow-y-auto custom-scrollbar border border-white/10 select-all">{sshKey}</div>
                  <button onClick={copyToClipboard} className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-white">
                    {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
                <button onClick={() => setShowSSH(false)} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-xs font-black uppercase">我已完成配置</button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 一键部署确认弹窗 */}
      {mounted && createPortal(
        <AnimatePresence>
          {confirmDeploy && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDeploy(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" />
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[40px] shadow-2xl border border-white/50 p-10 text-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6"><Rocket className="text-emerald-500" size={32} /></div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">执行一键部署？</h3>
                <p className="text-sm text-slate-500 mb-8 leading-relaxed">同步内容 → 构建静态站点 → 推送 gh-pages → 推送源码 main。构建需数分钟，期间请勿关闭窗口。</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDeploy(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-black transition-colors hover:bg-slate-200">取消</button>
                  <button onClick={handleOneClick} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/30 active:scale-95 transition-all">🚀 开始部署</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
