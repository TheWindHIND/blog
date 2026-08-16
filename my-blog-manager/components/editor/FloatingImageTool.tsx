"use client";

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useToast } from '../ToastProvider';
import { siteConfig } from '../../siteConfig';
import { GripVertical, X, RefreshCw, Check, AlertCircle, Upload, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';

interface UploadItem {
  id: string;
  file?: File;
  url?: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  resultUrl?: string;
  error?: string;
  previewUrl?: string;
}

interface FloatingImageToolProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (urls: string[]) => void;
  maxImages?: number;
}

export default function FloatingImageTool({ isOpen, onClose, onInsert, maxImages = 20 }: FloatingImageToolProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [externalUrls, setExternalUrls] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).slice(2, 10);

  const handleFilesSelected = useCallback((files: FileList | File[]) => {
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (uploadItems.length + fileArr.length > maxImages) {
      showToast(`最多只能选择 ${maxImages} 张图片`, 'warning');
      return;
    }
    const newItems: UploadItem[] = fileArr.map(file => ({
      id: generateId(),
      file,
      status: 'pending',
      previewUrl: URL.createObjectURL(file),
    }));
    setUploadItems(prev => [...prev, ...newItems]);
  }, [uploadItems.length, maxImages, showToast]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFilesSelected(e.dataTransfer.files);
  };

  const uploadSingleItem = async (item: UploadItem): Promise<string> => {
    if (!item.file) throw new Error('No file');
    const picUrl = (siteConfig as any).picBedUrl || "https://pic.dusays.com";
    const picToken = (siteConfig as any).picBedToken;
    if (!picToken) throw new Error('未配置图床 Token');

    const configRes = await fetch(`/backend_config.json?t=${Date.now()}`);
    const configData = await configRes.json();
    const formData = new FormData();
    formData.append('file', item.file);
    formData.append('url', picUrl);
    formData.append('token', picToken);

    const res = await fetch(`http://127.0.0.1:${configData.api_port}/api/picbed/upload`, {
      method: 'POST', body: formData,
    });
    const data = await res.json();
    if (data.success && data.url) return data.url;
    throw new Error(data.message || '上传失败');
  };

  const startBatchUpload = async () => {
    const pending = uploadItems.filter(i => i.status === 'pending');
    if (pending.length === 0) { showToast('没有待上传的图片', 'warning'); return; }

    // 3 并发上传
    const CONCURRENCY = 3;
    let idx = 0;
    const runNext = async () => {
      while (idx < pending.length) {
        const item = pending[idx++];
        setUploadItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'uploading' } : p));
        try {
          const url = await uploadSingleItem(item);
          setUploadItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'done', resultUrl: url } : p));
        } catch (err: any) {
          setUploadItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'error', error: err.message } : p));
        }
      }
    };
    const workers = Array.from({ length: Math.min(CONCURRENCY, pending.length) }, () => runNext());
    await Promise.allSettled(workers);
    showToast('批量上传完成', 'success');
  };

  const retryFailed = () => {
    setUploadItems(prev => prev.map(i => i.status === 'error' ? { ...i, status: 'pending', error: undefined } : i));
  };

  const removeItem = (id: string) => {
    setUploadItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  };

  const clearAll = () => {
    uploadItems.forEach(i => { if (i.previewUrl) URL.revokeObjectURL(i.previewUrl); });
    setUploadItems([]);
    setExternalUrls('');
  };

  const handleInsert = () => {
    if (activeTab === 'upload') {
      const urls = uploadItems.filter(i => i.status === 'done' && i.resultUrl).map(i => i.resultUrl!);
      if (urls.length === 0) { showToast('没有已上传的图片', 'warning'); return; }
      onInsert(urls);
    } else {
      const urls = externalUrls.split('\n').map(u => u.trim()).filter(Boolean);
      if (urls.length === 0) { showToast('请输入图片链接', 'warning'); return; }
      onInsert(urls);
    }
    clearAll();
    onClose();
  };

  const doneCount = uploadItems.filter(i => i.status === 'done').length;
  const failCount = uploadItems.filter(i => i.status === 'error').length;
  const uploadingCount = uploadItems.filter(i => i.status === 'uploading').length;
  const pendingCount = uploadItems.filter(i => i.status === 'pending').length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          drag dragMomentum={false} dragElastic={0}
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          style={{ position: 'fixed', top: '10vh', right: '3vw', zIndex: 99999 }}
          className="w-96 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-white/50 dark:border-white/10 overflow-hidden flex flex-col cursor-move"
        >
          {/* 标题栏 */}
          <div className="flex justify-between items-center p-5 border-b border-white/30 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="text-emerald-500 text-lg">☁️</span> 图床工作台
              {uploadItems.length > 0 && <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-500 rounded-full">{uploadItems.length} 张</span>}
            </h3>
            <button onClick={() => { clearAll(); onClose(); }} className="w-8 h-8 rounded-full bg-white/50 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer shadow-sm">
              <X size={14} />
            </button>
          </div>

          <div className="p-5 cursor-default bg-white/20 dark:bg-slate-900/20 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* Tab 切换 */}
            <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-2xl mb-4">
              <button onClick={() => setActiveTab('upload')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'upload' ? 'bg-white dark:bg-slate-700 text-emerald-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Upload size={13} /> 批量上传
              </button>
              <button onClick={() => setActiveTab('url')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'url' ? 'bg-white dark:bg-slate-700 text-emerald-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <LinkIcon size={13} /> 外链插入
              </button>
            </div>

            {activeTab === 'upload' ? (
              <>
                {/* 拖拽上传区 */}
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full h-28 border-2 border-dashed rounded-2xl flex items-center justify-center gap-3 cursor-pointer transition-all ${isDragging ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-900/40' : 'border-slate-300/80 dark:border-slate-600/80 hover:bg-white/60 dark:hover:bg-slate-800/60'}`}
                >
                  <input type="file" ref={fileInputRef} onChange={e => e.target.files && handleFilesSelected(e.target.files)} accept="image/*" multiple className="hidden" />
                  <div className="text-3xl">📥</div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">点击或拖拽多张图片</p>
                    <p className="text-[10px] text-slate-400 mt-1">最多 {maxImages} 张</p>
                  </div>
                </div>

                {/* 上传队列 */}
                {uploadItems.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {/* 状态栏 */}
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-2">
                      <span>
                        {doneCount > 0 && <span className="text-emerald-500">{doneCount} 已完成 </span>}
                        {uploadingCount > 0 && <span className="text-indigo-500">{uploadingCount} 上传中 </span>}
                        {pendingCount > 0 && <span className="text-slate-400">{pendingCount} 待上传 </span>}
                        {failCount > 0 && <span className="text-red-500">{failCount} 失败</span>}
                      </span>
                      {failCount > 0 && (
                        <button onClick={retryFailed} className="flex items-center gap-1 text-indigo-500 hover:text-indigo-600">
                          <RefreshCw size={10} /> 重试失败
                        </button>
                      )}
                    </div>

                    {/* 图片列表（可拖拽排序） */}
                    <Reorder.Group axis="y" values={uploadItems} onReorder={setUploadItems} className="space-y-2">
                      {uploadItems.map(item => (
                        <Reorder.Item key={item.id} value={item} className="flex items-center gap-2 p-2 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-white/40 dark:border-white/10">
                          <div className="cursor-grab text-slate-300 hover:text-slate-500"><GripVertical size={14} /></div>
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                            {item.previewUrl ? <img src={item.previewUrl} className="w-full h-full object-cover" /> : <ImageIcon size={16} className="m-auto text-slate-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">{item.file?.name || '外链图片'}</p>
                            {item.status === 'error' && <p className="text-[10px] text-red-500 truncate">{item.error}</p>}
                            {item.status === 'done' && <p className="text-[10px] text-emerald-500 truncate">{item.resultUrl}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            {item.status === 'pending' && <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center"><span className="text-[8px] text-slate-400">⏳</span></span>}
                            {item.status === 'uploading' && <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" /></span>}
                            {item.status === 'done' && <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center"><Check size={10} className="text-emerald-500" /></span>}
                            {item.status === 'error' && <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center"><AlertCircle size={10} className="text-red-500" /></span>}
                            <button onClick={() => removeItem(item.id)} className="w-5 h-5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                              <X size={10} />
                            </button>
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>

                    {/* 操作按钮 */}
                    <div className="flex gap-2 mt-3">
                      {pendingCount > 0 && (
                        <button onClick={startBatchUpload} className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all active:scale-95">
                          🚀 开始上传 ({pendingCount})
                        </button>
                      )}
                      {doneCount > 0 && (
                        <button onClick={handleInsert} className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all active:scale-95">
                          ✨ 插入全部 ({doneCount})
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* 外链模式：支持多行 URL */
              <div className="space-y-3">
                <textarea
                  value={externalUrls}
                  onChange={e => setExternalUrls(e.target.value)}
                  placeholder={"每行一个图片链接：\nhttps://example.com/img1.jpg\nhttps://example.com/img2.png"}
                  className="w-full h-32 p-4 text-xs font-medium bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none text-slate-700 dark:text-slate-200"
                />
                <button onClick={handleInsert} className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all active:scale-95">
                  ✨ 插入图片
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
