"use client";

import { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';
import { albums, Album, AnimationMode } from '../../data/albums';
import { createAnimationEngine, ANIMATION_MODES, AnimationEngine } from '../../components/PhotoAnimationEngine';

// Three.js 组件懒加载
const MagicCubeScene = lazy(() => import('../../components/ThreeAnimations').then(m => ({ default: m.MagicCubeScene })));
const LiquidGlassScene = lazy(() => import('../../components/ThreeAnimations').then(m => ({ default: m.LiquidGlassScene })));
const InfiniteDepthScene = lazy(() => import('../../components/ThreeAnimations').then(m => ({ default: m.InfiniteDepthScene })));

function ThreeFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-white/50 text-sm font-medium animate-pulse">加载 3D 引擎中...</div>
    </div>
  );
}

export default function PhotoWallClient() {
  const [currentAlbum, setCurrentAlbum] = useState<Album | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string; caption?: string } | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [nextPhotoIndex, setNextPhotoIndex] = useState<number | null>(null);
  const [isGridMode, setIsGridMode] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [threeTransitioning, setThreeTransitioning] = useState(false);
  const [threeDirection, setThreeDirection] = useState<'next' | 'prev'>('next');

  // 滚轮交互状态
  const [isExpanded, setIsExpanded] = useState(false);
  const wheelAccumRef = useRef(0);
  const wheelTimerRef = useRef<NodeJS.Timeout | null>(null);

  const animContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<AnimationEngine | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // 搜索防抖
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setActiveQuery(searchQuery.toLowerCase());
      setIsTransitioning(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { matchedAlbums, matchedPhotos } = useMemo(() => {
    if (!activeQuery) return { matchedAlbums: albums, matchedPhotos: [] };
    const matchedAlbums = albums.filter(album =>
      album.title.toLowerCase().includes(activeQuery) ||
      (album.description || '').toLowerCase().includes(activeQuery)
    );
    const matchedPhotos = albums.flatMap(album =>
      album.photos.map(p => ({ ...p, albumName: album.title }))
    ).filter(photo => photo.caption?.toLowerCase().includes(activeQuery));
    return { matchedAlbums, matchedPhotos };
  }, [activeQuery]);

  const currentMode = (currentAlbum?.animationMode || 'spatial-rift') as AnimationMode;
  const modeInfo = ANIMATION_MODES.find(m => m.value === currentMode);
  const isThreeMode = ['magic-cube', 'liquid-glass', 'infinite-depth'].includes(currentMode);

  // 初始化 CSS 动画引擎（非 Three.js 模式）
  useEffect(() => {
    if (!currentAlbum || isGridMode || isThreeMode || !animContainerRef.current) return;
    const engine = createAnimationEngine(currentMode);
    engine.init(animContainerRef.current, currentAlbum.photos.map(p => p.url));
    engineRef.current = engine;
    return () => { engine.destroy(); engineRef.current = null; };
  }, [currentAlbum, isGridMode, isThreeMode, currentMode]);

  // 翻页函数（支持循环）
  const navigatePhoto = useCallback((direction: 'next' | 'prev') => {
    if (!currentAlbum || isAnimating) return;
    const photos = currentAlbum.photos;
    if (photos.length <= 1) return;

    // 循环索引
    const nextIdx = direction === 'next'
      ? (currentPhotoIndex + 1) % photos.length
      : (currentPhotoIndex - 1 + photos.length) % photos.length;

    if (isThreeMode) {
      setNextPhotoIndex(nextIdx);
      setThreeDirection(direction);
      setThreeTransitioning(true);
      setIsAnimating(true);
    } else if (engineRef.current && animContainerRef.current) {
      setIsAnimating(true);
      engineRef.current.transition({
        images: photos.map(p => p.url),
        currentIndex: currentPhotoIndex,
        direction,
        container: animContainerRef.current,
        onComplete: () => {
          setCurrentPhotoIndex(nextIdx);
          requestAnimationFrame(() => setIsAnimating(false));
        },
      });
    }
  }, [currentAlbum, currentPhotoIndex, isAnimating, isThreeMode]);

  const handleThreeTransitionEnd = useCallback(() => {
    if (nextPhotoIndex !== null) {
      setCurrentPhotoIndex(nextPhotoIndex);
      setNextPhotoIndex(null);
    }
    setThreeTransitioning(false);
    setIsAnimating(false);
  }, [nextPhotoIndex]);

  // 滚轮交互：隐藏标题 + 最大化画面
  useEffect(() => {
    if (!currentAlbum || isGridMode || selectedImage) return;

    const handleWheel = (e: WheelEvent) => {
      // 全屏查看器打开时不处理
      if (selectedImage) return;

      e.preventDefault();
      wheelAccumRef.current += e.deltaY;

      // 清除之前的定时器
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);

      // 阈值：累积滚动量超过 120 切换状态
      if (Math.abs(wheelAccumRef.current) > 120) {
        if (wheelAccumRef.current > 0 && !isExpanded) {
          setIsExpanded(true); // 向下滚动 → 展开
        } else if (wheelAccumRef.current < 0 && isExpanded) {
          setIsExpanded(false); // 向上滚动 → 收起
        }
        wheelAccumRef.current = 0;
      }

      // 500ms 无操作重置累积
      wheelTimerRef.current = setTimeout(() => { wheelAccumRef.current = 0; }, 500);
    };

    const el = animContainerRef.current?.parentElement;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, [currentAlbum, isGridMode, isExpanded, selectedImage]);

  // 键盘导航
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (selectedImage && currentAlbum) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); navigateViewer('next'); return; }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); navigateViewer('prev'); return; }
        if (e.key === 'Escape') { setSelectedImage(null); return; }
      }
      if (currentAlbum && !isGridMode && !selectedImage) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); navigatePhoto('next'); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); navigatePhoto('prev'); }
        if (e.key === 'Escape') {
          if (isExpanded) setIsExpanded(false);
          else setCurrentAlbum(null);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentAlbum, isGridMode, navigatePhoto, selectedImage, viewerIndex, isExpanded]);

  // 鼠标/触摸滑动切换
  const handlePointerDown = (e: React.PointerEvent) => {
    touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!touchStartRef.current || isAnimating) return;
    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.time;
    const baseThreshold = Math.max(50, window.innerWidth * 0.08);
    const threshold = elapsed < 300 ? baseThreshold * 0.5 : baseThreshold;
    if (Math.abs(dx) > Math.abs(dy) * 1.2 && Math.abs(dx) > threshold) {
      navigatePhoto(dx > 0 ? 'prev' : 'next');
    }
    touchStartRef.current = null;
  };

  // 进入相册
  const openAlbum = (album: Album) => {
    setSearchQuery('');
    setCurrentAlbum(album);
    setCurrentPhotoIndex(0);
    setIsGridMode(false);
    setIsAnimating(false);
    setThreeTransitioning(false);
    setNextPhotoIndex(null);
    setIsExpanded(false);
  };

  // 离开相册
  const closeAlbum = () => {
    setCurrentAlbum(null);
    setIsGridMode(false);
    setCurrentPhotoIndex(0);
    setIsAnimating(false);
    setIsExpanded(false);
  };

  // 全屏查看器导航（支持循环）
  const navigateViewer = useCallback((direction: 'next' | 'prev') => {
    if (!currentAlbum) return;
    const photos = currentAlbum.photos;
    if (photos.length <= 1) return;
    const newIdx = direction === 'next'
      ? (viewerIndex + 1) % photos.length
      : (viewerIndex - 1 + photos.length) % photos.length;
    setViewerIndex(newIdx);
    setSelectedImage({ url: photos[newIdx].url, caption: photos[newIdx].caption });
  }, [currentAlbum, viewerIndex]);

  const openViewer = (index: number) => {
    if (!currentAlbum) return;
    setViewerIndex(index);
    setSelectedImage({ url: currentAlbum.photos[index].url, caption: currentAlbum.photos[index].caption });
  };

  // 渲染 Three.js 场景
  const renderThreeScene = () => {
    if (!currentAlbum) return null;
    const photos = currentAlbum.photos;
    const currentUrl = photos[currentPhotoIndex]?.url;
    const nextUrl = nextPhotoIndex !== null ? photos[nextPhotoIndex]?.url : null;

    const commonProps = {
      imageUrl: currentUrl,
      nextImageUrl: nextUrl,
      isTransitioning: threeTransitioning,
      onTransitionEnd: handleThreeTransitionEnd,
    };

    switch (currentMode) {
      case 'magic-cube':
        return <Suspense fallback={<ThreeFallback />}><MagicCubeScene {...commonProps} direction={threeDirection} /></Suspense>;
      case 'liquid-glass':
        return <Suspense fallback={<ThreeFallback />}><LiquidGlassScene {...commonProps} /></Suspense>;
      case 'infinite-depth':
        return <Suspense fallback={<ThreeFallback />}><InfiniteDepthScene images={photos.map(p => p.url)} currentIndex={currentPhotoIndex} nextIndex={nextPhotoIndex} {...commonProps} /></Suspense>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen relative pb-32">
      <Navbar />

      <PageTransition>
        <div className="w-full max-w-7xl mx-auto mt-28 px-4 sm:px-10 relative z-10">

          {/* ===== 相册列表 ===== */}
          {!currentAlbum && (
            <div className="animate-fade-in-up">
              <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
                <div>
                  <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-widest mb-2">光影画廊</h1>
                  <p className="text-slate-600 dark:text-slate-400 font-medium tracking-wider">定格时间，封存泰拉与现实的每一次心跳</p>
                </div>
                <div className="relative w-full md:w-80 group">
                  <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none text-slate-500 group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text" placeholder="搜索相册名或照片描述..." value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-full text-sm text-slate-800 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm transition-all"
                  />
                </div>
              </div>

              <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                {activeQuery && matchedPhotos.length > 0 && (
                  <div className="mb-16">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                      <span className="w-2 h-6 bg-indigo-500 rounded-full" />
                      匹配的单张照片 ({matchedPhotos.length})
                    </h3>
                    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
                      {matchedPhotos.map((photo, index) => (
                        <div key={`sp-${index}`} onClick={() => setSelectedImage(photo)}
                          className="break-inside-avoid relative group rounded-2xl overflow-hidden cursor-zoom-in shadow-lg bg-white/20 dark:bg-slate-800/20 border border-white/30 dark:border-white/10 transition-transform duration-500 hover:scale-[1.02]">
                          <img src={photo.url} alt={photo.caption} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-5">
                            <span className="text-indigo-300 font-black text-[10px] tracking-widest uppercase mb-1">{photo.albumName}</span>
                            <p className="text-white font-medium text-sm translate-y-4 group-hover:translate-y-0 transition-transform duration-500">{photo.caption}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-20 mt-10">
                  {matchedAlbums.map((album) => (
                    <div key={album.id} onClick={() => openAlbum(album)} className="group cursor-pointer flex flex-col items-center">
                      <div className="relative w-[85%] aspect-[4/3] mb-8">
                        <div className="absolute inset-0 bg-slate-300 dark:bg-slate-700 rounded-[4px] shadow-md transform rotate-6 translate-x-4 translate-y-2 group-hover:rotate-12 transition-all duration-500 border-[6px] border-white dark:border-slate-200 overflow-hidden opacity-60">
                          {album.photos[2] && <img src={album.photos[2].url} className="w-full h-full object-cover grayscale blur-[2px]" alt="" />}
                        </div>
                        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-600 rounded-[4px] shadow-lg transform -rotate-3 -translate-x-2 -translate-y-1 group-hover:-rotate-6 transition-all duration-500 border-[6px] border-white dark:border-slate-200 overflow-hidden opacity-80 z-10">
                          {album.photos[1] && <img src={album.photos[1].url} className="w-full h-full object-cover grayscale-[50%]" alt="" />}
                        </div>
                        <div className="absolute inset-0 bg-white dark:bg-slate-200 rounded-[4px] shadow-2xl border-[6px] border-white dark:border-slate-200 overflow-hidden z-20 transform group-hover:-translate-y-2 group-hover:scale-105 transition-all duration-500">
                          <img src={album.cover} alt={album.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-5">
                            <span className="text-white font-bold text-lg drop-shadow-md">{album.photos.length} 张照片</span>
                            {album.animationMode && <span className="text-indigo-300 font-medium text-xs mt-1">{ANIMATION_MODES.find(m => m.value === album.animationMode)?.icon} {ANIMATION_MODES.find(m => m.value === album.animationMode)?.label}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-center px-4 w-full">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{album.title}</h2>
                          <span className="text-[10px] font-black text-slate-500 bg-white/60 dark:bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-sm uppercase tracking-wider">{album.date}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">{album.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {activeQuery && matchedAlbums.length === 0 && matchedPhotos.length === 0 && (
                  <div className="text-center py-20 text-slate-500 font-medium">在泰拉大陆的任何角落都没找到相关的记忆...</div>
                )}
              </div>
            </div>
          )}

          {/* ===== 相册详情：动画/网格模式 ===== */}
          {currentAlbum && (
            <div className="animate-fade-in-up">
              {/* 顶部信息栏 — 展开时隐藏标题描述，只保留功能栏 */}
              <div
                className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-300/50 dark:border-slate-700/50 pb-6 overflow-hidden transition-all duration-700 ease-out"
                style={{
                  marginBottom: isExpanded ? '0px' : '32px',
                  maxHeight: isExpanded ? '60px' : '300px',
                  opacity: isExpanded ? 0.85 : 1,
                }}
              >
                <div className="w-full">
                  <div className="flex items-center gap-4 mb-2">
                    <button onClick={closeAlbum} className="group flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                      <span className="bg-white/40 dark:bg-slate-800/50 backdrop-blur-md p-1.5 rounded-lg border border-white/50 shadow-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                      </span>
                      返回画廊
                    </button>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{currentAlbum.date}</span>
                    {modeInfo && !isGridMode && (
                      <span className="text-xs font-bold text-indigo-500 bg-indigo-500/10 px-3 py-1 rounded-full">{modeInfo.icon} {modeInfo.label}</span>
                    )}
                    {!isGridMode && (
                      <span className="text-[10px] text-slate-400 ml-auto hidden md:inline">
                        {isExpanded ? '↑ 滚轮上滑恢复' : '↓ 滚轮下滑最大化'}
                      </span>
                    )}
                  </div>
                  {!isExpanded && (
                    <>
                      <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-wider mb-2">{currentAlbum.title}</h1>
                      <p className="text-slate-600 dark:text-slate-400 font-medium text-lg">{currentAlbum.description}</p>
                    </>
                  )}
                </div>
                {!isExpanded && (
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-bold text-slate-500 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/50 shadow-sm">
                      共 <span className="text-indigo-500 text-lg">{currentAlbum.photos.length}</span> 瞬间
                    </div>
                  </div>
                )}
              </div>

              {/* 动画模式 / 网格模式 */}
              {!isGridMode ? (
                <div className="relative">
                  <div
                    ref={animContainerRef}
                    onPointerDown={!isThreeMode ? handlePointerDown : undefined}
                    onPointerUp={!isThreeMode ? handlePointerUp : undefined}
                    onDoubleClick={() => openViewer(currentPhotoIndex)}
                    className="w-full bg-black/90 dark:bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl select-none cursor-pointer transition-all duration-700 ease-out"
                    style={{
                      aspectRatio: isExpanded ? 'auto' : '16/9',
                      maxHeight: isExpanded ? 'calc(100vh - 120px)' : '75vh',
                      height: isExpanded ? 'calc(100vh - 120px)' : undefined,
                      touchAction: 'pan-y',
                      position: 'relative',
                    }}
                  >
                    {/* Three.js 场景 */}
                    {isThreeMode ? (
                      renderThreeScene()
                    ) : (
                      currentAlbum.photos[currentPhotoIndex] && (
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                          <img
                            data-react-static
                            src={currentAlbum.photos[currentPhotoIndex].url}
                            alt={currentAlbum.photos[currentPhotoIndex].caption || ''}
                            className="w-full h-full object-contain rounded-2xl shadow-2xl transition-transform duration-300"
                            style={{ transform: hoveredIndex === currentPhotoIndex ? 'scale(1.03)' : 'scale(1)' }}
                            onMouseEnter={() => setHoveredIndex(currentPhotoIndex)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            draggable={false}
                          />
                        </div>
                      )
                    )}
                  </div>

                  {/* 翻页按钮 */}
                  {currentAlbum.photos.length > 1 && (
                    <>
                      <button
                        onClick={() => navigatePhoto('prev')}
                        disabled={isAnimating}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 dark:bg-slate-800/60 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all disabled:opacity-30 z-20"
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <button
                        onClick={() => navigatePhoto('next')}
                        disabled={isAnimating}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 dark:bg-slate-800/60 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all disabled:opacity-30 z-20"
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </>
                  )}

                  {/* 底部照片指示器 + 描述 — 展开时隐藏 */}
                  {!isExpanded && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-20">
                      {currentAlbum.photos[currentPhotoIndex]?.caption && (
                        <div className="px-6 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white text-sm font-medium">
                          {currentAlbum.photos[currentPhotoIndex].caption}
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        {currentAlbum.photos.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              if (i === currentPhotoIndex || isAnimating) return;
                              const direction = i > currentPhotoIndex ? 'next' : 'prev';
                              if (isThreeMode) {
                                setNextPhotoIndex(i);
                                setThreeDirection(direction);
                                setThreeTransitioning(true);
                                setIsAnimating(true);
                              } else if (engineRef.current && animContainerRef.current) {
                                setIsAnimating(true);
                                engineRef.current.transition({
                                  images: currentAlbum.photos.map(p => p.url),
                                  currentIndex: currentPhotoIndex,
                                  direction,
                                  container: animContainerRef.current,
                                  onComplete: () => { setCurrentPhotoIndex(i); requestAnimationFrame(() => setIsAnimating(false)); },
                                });
                              }
                            }}
                            className={`w-2 h-2 rounded-full transition-all ${i === currentPhotoIndex ? 'bg-white w-6' : 'bg-white/30 hover:bg-white/50'}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 双击提示 */}
                  <div className="absolute top-4 right-4 z-20">
                    <div className="px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white/60 text-[10px] font-bold tracking-wider">
                      双击放大查看
                    </div>
                  </div>
                </div>
              ) : (
                /* ===== 网格模式 ===== */
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
                  {currentAlbum.photos.map((photo, index) => (
                    <div
                      key={`${photo.url}-${index}`}
                      onClick={() => openViewer(index)}
                      className="break-inside-avoid relative group rounded-2xl overflow-hidden cursor-zoom-in shadow-lg bg-white/20 dark:bg-slate-800/20 border border-white/30 dark:border-white/10 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/20 animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || '照片'}
                        className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-5">
                        {photo.caption && <p className="text-white font-medium text-sm drop-shadow-md translate-y-4 group-hover:translate-y-0 transition-transform duration-500">{photo.caption}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 右下角模式切换滑块 */}
              {currentAlbum.photos.length > 0 && (
                <div className="fixed bottom-8 right-8 z-50">
                  <div className="bg-white/20 dark:bg-slate-800/40 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-2xl p-3 shadow-xl flex items-center gap-3">
                    <span className={`text-xs font-bold transition-colors ${!isGridMode ? 'text-indigo-500' : 'text-slate-400'}`}>
                      {modeInfo?.icon || '🌌'} 动画
                    </span>
                    <button
                      onClick={() => setIsGridMode(!isGridMode)}
                      className={`relative w-14 h-7 rounded-full transition-all duration-300 ${isGridMode ? 'bg-indigo-500' : 'bg-slate-400 dark:bg-slate-600'}`}
                    >
                      <div
                        className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300"
                        style={{ left: isGridMode ? '30px' : '2px' }}
                      />
                    </button>
                    <span className={`text-xs font-bold transition-colors ${isGridMode ? 'text-indigo-500' : 'text-slate-400'}`}>
                      ⊞ 网格
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PageTransition>

      {/* ===== 全屏图片查看器 ===== */}
      {selectedImage && currentAlbum && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedImage(null); }}
        >
          {/* 顶部工具栏 */}
          <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/60 to-transparent">
            <div className="text-white/60 text-sm font-bold">
              {viewerIndex + 1} / {currentAlbum.photos.length}
            </div>
            <div className="flex items-center gap-2">
              {selectedImage.caption && (
                <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white text-sm font-medium mr-2">
                  {selectedImage.caption}
                </div>
              )}
              <button
                onClick={() => setSelectedImage(null)}
                className="text-white/50 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full p-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* 左导航按钮 */}
          {currentAlbum.photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigateViewer('prev'); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95"
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* 图片主体 */}
          <img
            src={selectedImage.url}
            alt={selectedImage.caption || ''}
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-2xl shadow-2xl select-none transition-transform duration-200"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />

          {/* 右导航按钮 */}
          {currentAlbum.photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigateViewer('next'); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95"
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* 底部缩略图导航条 */}
          {currentAlbum.photos.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/60 to-transparent pt-12 pb-4">
              <div className="flex items-center justify-center gap-2 px-4 overflow-x-auto no-scrollbar">
                {currentAlbum.photos.map((photo, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerIndex(i);
                      setSelectedImage({ url: photo.url, caption: photo.caption });
                    }}
                    className={`flex-shrink-0 w-14 h-10 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                      i === viewerIndex
                        ? 'border-white scale-110 shadow-lg shadow-white/20'
                        : 'border-white/20 opacity-50 hover:opacity-80 hover:scale-105'
                    }`}
                  >
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 键盘提示 */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 text-white/30 text-[10px] font-bold tracking-wider">
            <span className="px-2 py-0.5 border border-white/20 rounded">←</span>
            <span className="px-2 py-0.5 border border-white/20 rounded">→</span>
            <span className="ml-1">键盘切换</span>
            <span className="mx-2">|</span>
            <span className="px-2 py-0.5 border border-white/20 rounded">ESC</span>
            <span className="ml-1">关闭</span>
          </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}
