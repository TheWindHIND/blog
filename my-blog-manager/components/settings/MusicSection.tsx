"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MusicSection({ 
  formData, 
  handleUpdate, 
  pushToQueue, 
  musicDetails, 
  queryMusic, 
  queryLoading, 
  queryResult, 
  confirmAddMusic, 
  removeSong,
  addLocalMusic,
  removeLocalMusic,
  fetchLocalMusicInfo,
  fillLoading
}: any) {
  const [activeSubTab, setActiveSubTab] = useState('netease');

  return (
    <motion.section 
      initial={{ opacity: 0, x: 10 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -10 }} 
      className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-slate-800/50 rounded-[40px] p-8 shadow-2xl"
    >
      <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6">🎵 歌单管理与查询</h2>
      
      {/* 子标签页切换 */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setActiveSubTab('netease')}
          className={`px-6 py-2 rounded-2xl text-sm font-bold transition-all ${
            activeSubTab === 'netease'
              ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30'
              : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-white/80'
          }`}
        >
          ☁️ 网易云音乐
        </button>
        <button
          onClick={() => setActiveSubTab('local')}
          className={`px-6 py-2 rounded-2xl text-sm font-bold transition-all ${
            activeSubTab === 'local'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
              : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-white/80'
          }`}
        >
          🔗 音乐直链
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* 网易云音乐标签页 */}
        {activeSubTab === 'netease' && (
          <motion.div
            key="netease"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-10"
          >
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-4">
                当前绑定的网易云 ID ({formData.cloudMusicIds.length})
              </p>
              <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {formData.cloudMusicIds.map((id: string, index: number) => {
                  const detail = musicDetails[id];
                  return (
                    <div 
                      key={index} 
                      className="flex justify-between items-center p-3 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/20 group"
                    >
                      <div className="flex items-center gap-3">
                        {detail?.cover ? (
                          <img 
                            src={detail.cover} 
                            alt="cover" 
                            className="w-10 h-10 rounded-lg object-cover shadow-sm" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse flex items-center justify-center text-xs">
                            💿
                          </div>
                        )}
                        <div className="flex flex-col">
                          {detail ? (
                            <>
                              <span className={`text-sm font-bold line-clamp-1 ${detail.error ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
                                {detail.name}
                              </span>
                              {!detail.error && (
                                <span className="text-[10px] text-slate-500 font-medium">
                                  {detail.artist}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">正在解析...</span>
                          )}
                          <span className="text-[10px] font-mono text-pink-500 mt-0.5">#{id}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeSong(index)} 
                        className="w-8 h-8 shrink-0 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-slate-100/50 dark:bg-slate-800/50 rounded-3xl p-6 space-y-6">
              <p className="text-[10px] font-black text-slate-400 uppercase">校验并添加新 ID</p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="输入歌曲 ID" 
                  value={formData.newMusicId} 
                  onChange={e => handleUpdate('newMusicId', e.target.value)} 
                  className="flex-1 bg-white dark:bg-slate-900 border-none rounded-2xl px-4 py-3 text-sm outline-none shadow-sm" 
                />
                <button 
                  onClick={queryMusic} 
                  disabled={queryLoading} 
                  className="px-6 py-3 bg-pink-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-pink-500/20 disabled:opacity-50"
                >
                  {queryLoading ? "请求中..." : "真实查询"}
                </button>
              </div>
              <AnimatePresence>
                {queryResult && !queryResult.error && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    className="p-3 bg-white dark:bg-slate-900 rounded-2xl border-2 border-green-500/30 flex justify-between items-center shadow-xl"
                  >
                    <div className="flex items-center gap-3">
                      <img src={queryResult.cover} alt="cover" className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <p className="text-[10px] font-black text-green-600">获取成功</p>
                        <p className="text-xs font-bold line-clamp-1">{queryResult.name}</p>
                      </div>
                    </div>
                    <button 
                      onClick={confirmAddMusic} 
                      className="px-3 py-2 bg-green-500 text-white rounded-xl text-[10px] font-black shrink-0 hover:bg-green-600 transition-colors"
                    >
                      存入列表
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                onClick={() => pushToQueue('网易云歌单', 'cloudMusicIds', formData.cloudMusicIds)}
                className="w-full py-4 bg-indigo-500 text-white rounded-2xl text-sm font-black shadow-xl mt-4 active:scale-95 transition-all"
              >
                暂存音乐修改
              </button>
            </div>
          </motion.div>
        )}

        {/* 本地音乐标签页 */}
        {activeSubTab === 'local' && (
          <motion.div
            key="local"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-10"
          >
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-4">
                音乐直链列表 ({formData.localMusic.length})
              </p>
              <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {formData.localMusic.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    还没有音乐直链，输入网易云ID添加一首吧~
                  </div>
                ) : (
                  formData.localMusic.map((song: any, index: number) => (
                    <div
                      key={song.id || index}
                      className="flex justify-between items-center p-3 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/20 group"
                    >
                      <div className="flex items-center gap-3">
                        {song.cover ? (
                          <img
                            src={song.cover}
                            alt="cover"
                            className="w-10 h-10 rounded-lg object-cover shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-emerald-200 dark:bg-emerald-700 flex items-center justify-center text-xs">
                            🎵
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm font-bold line-clamp-1 text-slate-800 dark:text-white">
                            {song.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {song.artist || '未知歌手'}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-500 mt-0.5">
                            {song.neteaseId ? `#${song.neteaseId}` : '直链'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeLocalMusic(index)}
                        className="w-8 h-8 shrink-0 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="bg-slate-100/50 dark:bg-slate-800/50 rounded-3xl p-6 space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase">添加音乐直链</p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">网易云歌曲ID *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="输入网易云歌曲ID，自动获取信息"
                      value={formData.newLocalMusic.neteaseId}
                      onChange={e => handleUpdate('newLocalMusic', { ...formData.newLocalMusic, neteaseId: e.target.value })}
                      className="flex-1 bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-sm outline-none shadow-sm"
                    />
                    <button
                      onClick={fetchLocalMusicInfo}
                      disabled={fillLoading}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                    >
                      {fillLoading ? "填充中..." : "自动填充"}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    输入ID后点击自动填充，将自动获取歌曲名、歌手、封面和歌词
                  </p>
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">歌曲名 *</label>
                  <input
                    type="text"
                    placeholder="输入歌曲名（自动填充后可修改）"
                    value={formData.newLocalMusic.name}
                    onChange={e => handleUpdate('newLocalMusic', { ...formData.newLocalMusic, name: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-sm outline-none shadow-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">歌手</label>
                  <input
                    type="text"
                    placeholder="输入歌手名（自动填充后可修改）"
                    value={formData.newLocalMusic.artist}
                    onChange={e => handleUpdate('newLocalMusic', { ...formData.newLocalMusic, artist: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-sm outline-none shadow-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">音频链接（可选，留空则自动生成）</label>
                  <input
                    type="text"
                    placeholder="https://music.163.com/song/media/outer/url?id=xxx.mp3"
                    value={formData.newLocalMusic.url}
                    onChange={e => handleUpdate('newLocalMusic', { ...formData.newLocalMusic, url: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-sm outline-none shadow-sm"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    填写网易云ID后会自动生成外链，也可以手动粘贴其他直链
                  </p>
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">
                    封面图片URL（可选）
                    <span className="text-emerald-500 ml-1">自动从网易云获取</span>
                  </label>
                  <input
                    type="text"
                    placeholder="https://p1.music.126.net/xxx.jpg"
                    value={formData.newLocalMusic.cover}
                    onChange={e => handleUpdate('newLocalMusic', { ...formData.newLocalMusic, cover: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-sm outline-none shadow-sm"
                    disabled={formData.newLocalMusic.neteaseId && formData.newLocalMusic.cover?.startsWith('http')}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    填写网易云ID后会自动获取封面，也可以手动粘贴图片URL
                  </p>
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">LRC歌词（可选，自动获取）</label>
                  <textarea
                    placeholder="点击自动填充后将自动获取LRC歌词..."
                    value={formData.newLocalMusic.lrc}
                    onChange={e => handleUpdate('newLocalMusic', { ...formData.newLocalMusic, lrc: e.target.value })}
                    rows={3}
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-sm outline-none shadow-sm resize-none"
                  />
                </div>
              </div>

              <button
                onClick={addLocalMusic}
                className="w-full py-3 bg-emerald-500 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                ➕ 添加音乐直链
              </button>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <button
                  onClick={() => pushToQueue('音乐直链', 'localMusic', formData.localMusic)}
                  className="w-full py-4 bg-indigo-500 text-white rounded-2xl text-sm font-black shadow-xl active:scale-95 transition-all"
                >
                  暂存音乐直链修改
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
