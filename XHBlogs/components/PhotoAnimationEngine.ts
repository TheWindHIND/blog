/**
 * 照片墙动画引擎 - 6 种纯 CSS/JS 翻页动画
 * 无需 Three.js / GSAP 依赖，全部使用原生 DOM + CSS transitions/transforms
 *
 * 1. 时空裂隙（SpatialRift）   — CSS 动态模糊 + Canvas 速度线 + 残影拖尾
 * 2. 卡片翻转（CardFlip）      — 3D 翻牌效果
 * 3. 滑动切换（SlideSwitch）   — 水平/垂直滑入滑出
 * 4. 淡入缩放（FadeZoom）      — 旧图缩小淡出 + 新图放大淡入
 * 5. 仿真翻页（PageTurn）      — 翻书角卷曲效果
 * 6. 3D 走马灯（Carousel3D）   — 环绕式 3D 轮播
 */

export type AnimationMode =
  | 'spatial-rift'
  | 'card-flip'
  | 'slide-switch'
  | 'fade-zoom'
  | 'page-turn'
  | 'carousel-3d';

export interface AnimationConfig {
  images: string[];
  currentIndex: number;
  direction: 'next' | 'prev';
  container: HTMLElement;
  onComplete: () => void;
}

export interface AnimationEngine {
  name: string;
  label: string;
  icon: string;
  init: (container: HTMLElement, images: string[]) => void;
  transition: (config: AnimationConfig) => void;
  destroy: () => void;
  supportsSwipe: boolean;
  isThreeJS: boolean;
}

/* ================================================================
 * 通用工具
 * ================================================================ */
function createImageEl(url: string, zIndex: number): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = `
    position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    z-index:${zIndex};will-change:transform,opacity;
  `;
  const img = document.createElement('img');
  img.src = url;
  img.style.cssText = `
    max-width:100%;max-height:100%;object-fit:contain;
    border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.5);
    user-select:none;pointer-events:none;
  `;
  el.appendChild(img);
  return el;
}

function hideReactImg(container: HTMLElement): HTMLElement | null {
  const el = container.querySelector('img[data-react-static]') as HTMLElement | null;
  if (el) el.style.opacity = '0';
  return el;
}

function showReactImg(el: HTMLElement | null) {
  if (el) el.style.opacity = '1';
}

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

/* ================================================================
 * 1. 时空裂隙 — 动态模糊甩出 + Canvas 速度线 + 残影拖尾
 * ================================================================ */
export class SpatialRiftEngine implements AnimationEngine {
  name = 'spatial-rift';
  label = '时空裂隙';
  icon = '🌌';
  supportsSwipe = true;
  isThreeJS = false;

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animating = false;
  private resizeHandler: (() => void) | null = null;

  init(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:10;';
    container.style.position = 'relative';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.resize();
    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);
  }

  private resize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  transition(config: AnimationConfig) {
    if (this.animating) return;
    this.animating = true;
    const { container, images, currentIndex, direction, onComplete } = config;
    const nextIndex = direction === 'next'
      ? (currentIndex + 1) % images.length
      : (currentIndex - 1 + images.length) % images.length;

    const reactImg = hideReactImg(container);
    const currentEl = createImageEl(images[currentIndex], 20);
    container.appendChild(currentEl);
    const exitAngle = direction === 'next' ? -30 : 30;
    const exitX = direction === 'next' ? '-120%' : '120%';

    const ghost = currentEl.cloneNode(true) as HTMLElement;
    ghost.style.zIndex = '19';
    ghost.style.opacity = '0.2';
    ghost.style.filter = 'blur(4px)';
    ghost.style.transition = 'all 0.5s ease-out';
    container.appendChild(ghost);

    const particles = this.createSpeedLines(7);

    requestAnimationFrame(() => {
      currentEl.style.transition = 'all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      currentEl.style.transform = `rotate(${exitAngle}deg) translate(${exitX}, -30%)`;
      currentEl.style.filter = 'blur(8px)';
      currentEl.style.opacity = '0.3';
    });

    const nextEl = createImageEl(images[nextIndex], 21);
    const enterAngle = -exitAngle;
    nextEl.style.transform = `rotate(${enterAngle}deg) translate(${direction === 'next' ? '120%' : '-120%'}, 30%)`;
    nextEl.style.opacity = '0';
    container.appendChild(nextEl);

    setTimeout(() => {
      nextEl.style.transition = 'all 0.45s cubic-bezier(0.19, 1, 0.22, 1)';
      nextEl.style.opacity = '1';
      nextEl.style.transform = 'rotate(0deg) translate(0, 0)';
    }, 80);

    this.animateSpeedLines(particles);
    setTimeout(() => {
      ghost.style.opacity = '0';
      ghost.style.transform = `rotate(${exitAngle * 0.5}deg) translate(${direction === 'next' ? '-60%' : '60%'}, -15%)`;
    }, 100);

    setTimeout(() => {
      currentEl.remove(); ghost.remove();
      this.clearCanvas();
      showReactImg(reactImg);
      this.animating = false;
      onComplete();
    }, 600);
  }

  private createSpeedLines(count: number) {
    const lines: { x: number; y: number; angle: number; length: number; speed: number; opacity: number }[] = [];
    for (let i = 0; i < count; i++) {
      lines.push({
        x: Math.random() * 100, y: Math.random() * 100,
        angle: -25 + Math.random() * 15, length: 60 + Math.random() * 120,
        speed: 3 + Math.random() * 4, opacity: 0.2 + Math.random() * 0.5,
      });
    }
    return lines;
  }

  private animateSpeedLines(lines: ReturnType<typeof this.createSpeedLines>) {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    let frame = 0;
    const maxFrames = 25;
    const draw = () => {
      if (frame >= maxFrames || !this.ctx) return;
      this.clearCanvas();
      const progress = frame / maxFrames;
      lines.forEach(line => {
        const x = (line.x / 100) * w + progress * line.speed * 60;
        const y = (line.y / 100) * h;
        const rad = (line.angle * Math.PI) / 180;
        const len = line.length * (1 - progress * 0.6);
        this.ctx!.beginPath();
        this.ctx!.moveTo(x, y);
        this.ctx!.lineTo(x + Math.cos(rad) * len, y + Math.sin(rad) * len);
        this.ctx!.strokeStyle = `rgba(255,255,255,${line.opacity * (1 - progress)})`;
        this.ctx!.lineWidth = 1.5;
        this.ctx!.lineCap = 'round';
        this.ctx!.stroke();
      });
      frame++;
      requestAnimationFrame(draw);
    };
    draw();
  }

  private clearCanvas() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  destroy() {
    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
    this.canvas?.remove();
    this.canvas = null; this.ctx = null; this.animating = false;
  }
}

/* ================================================================
 * 2. 卡片翻转 — 3D 翻牌效果
 * ================================================================ */
export class CardFlipEngine implements AnimationEngine {
  name = 'card-flip'; label = '卡片翻转'; icon = '🃏';
  supportsSwipe = true; isThreeJS = false;
  private animating = false;

  init(container: HTMLElement) {
    container.style.position = 'relative';
    container.style.perspective = '1200px';
  }

  transition(config: AnimationConfig) {
    if (this.animating) return;
    this.animating = true;
    const { container, images, currentIndex, direction, onComplete } = config;
    const nextIndex = direction === 'next'
      ? (currentIndex + 1) % images.length
      : (currentIndex - 1 + images.length) % images.length;

    const reactImg = hideReactImg(container);

    // 创建翻转卡片容器
    const card = document.createElement('div');
    card.style.cssText = `
      position:absolute;inset:0;z-index:20;
      transform-style:preserve-3d;
      transition:transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    // 正面
    const front = document.createElement('div');
    front.style.cssText = `
      position:absolute;inset:0;
      backface-visibility:hidden;
      display:flex;align-items:center;justify-content:center;
    `;
    const frontImg = document.createElement('img');
    frontImg.src = images[currentIndex];
    frontImg.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.5);user-select:none;pointer-events:none;';
    front.appendChild(frontImg);

    // 背面
    const back = document.createElement('div');
    back.style.cssText = `
      position:absolute;inset:0;
      backface-visibility:hidden;
      transform:rotateY(180deg);
      display:flex;align-items:center;justify-content:center;
    `;
    const backImg = document.createElement('img');
    backImg.src = images[nextIndex];
    backImg.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.5);user-select:none;pointer-events:none;';
    back.appendChild(backImg);

    card.appendChild(front);
    card.appendChild(back);
    container.appendChild(card);

    // 触发翻转
    requestAnimationFrame(() => {
      card.style.transform = `rotateY(${direction === 'next' ? -180 : 180}deg)`;
    });

    setTimeout(() => {
      card.remove();
      showReactImg(reactImg);
      this.animating = false;
      onComplete();
    }, 750);
  }

  destroy() { this.animating = false; }
}

/* ================================================================
 * 3. 滑动切换 — 水平滑入滑出
 * ================================================================ */
export class SlideSwitchEngine implements AnimationEngine {
  name = 'slide-switch'; label = '滑动切换'; icon = '➡️';
  supportsSwipe = true; isThreeJS = false;
  private animating = false;

  init(container: HTMLElement) {
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
  }

  transition(config: AnimationConfig) {
    if (this.animating) return;
    this.animating = true;
    const { container, images, currentIndex, direction, onComplete } = config;
    const nextIndex = direction === 'next'
      ? (currentIndex + 1) % images.length
      : (currentIndex - 1 + images.length) % images.length;

    const reactImg = hideReactImg(container);

    // 当前图片（向左/右滑出）
    const currentEl = createImageEl(images[currentIndex], 20);
    container.appendChild(currentEl);

    // 新图片（从右/左滑入）
    const nextEl = createImageEl(images[nextIndex], 21);
    nextEl.style.transform = `translateX(${direction === 'next' ? '100%' : '-100%'})`;
    container.appendChild(nextEl);

    requestAnimationFrame(() => {
      currentEl.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
      currentEl.style.transform = `translateX(${direction === 'next' ? '-100%' : '100%'})`;

      nextEl.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
      nextEl.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
      currentEl.remove(); nextEl.remove();
      showReactImg(reactImg);
      this.animating = false;
      onComplete();
    }, 550);
  }

  destroy() { this.animating = false; }
}

/* ================================================================
 * 4. 淡入缩放 — 旧图缩小淡出 + 新图放大淡入
 * ================================================================ */
export class FadeZoomEngine implements AnimationEngine {
  name = 'fade-zoom'; label = '淡入缩放'; icon = '🔍';
  supportsSwipe = true; isThreeJS = false;
  private animating = false;

  init(container: HTMLElement) {
    container.style.position = 'relative';
  }

  transition(config: AnimationConfig) {
    if (this.animating) return;
    this.animating = true;
    const { container, images, currentIndex, direction, onComplete } = config;
    const nextIndex = direction === 'next'
      ? (currentIndex + 1) % images.length
      : (currentIndex - 1 + images.length) % images.length;

    const reactImg = hideReactImg(container);

    // 当前图片（缩小淡出）
    const currentEl = createImageEl(images[currentIndex], 20);
    container.appendChild(currentEl);

    // 新图片（放大淡入）
    const nextEl = createImageEl(images[nextIndex], 21);
    nextEl.style.opacity = '0';
    nextEl.style.transform = 'scale(1.15)';
    container.appendChild(nextEl);

    requestAnimationFrame(() => {
      currentEl.style.transition = 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)';
      currentEl.style.transform = 'scale(0.85)';
      currentEl.style.opacity = '0';

      nextEl.style.transition = 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)';
      nextEl.style.opacity = '1';
      nextEl.style.transform = 'scale(1)';
    });

    setTimeout(() => {
      currentEl.remove(); nextEl.remove();
      showReactImg(reactImg);
      this.animating = false;
      onComplete();
    }, 550);
  }

  destroy() { this.animating = false; }
}

/* ================================================================
 * 5. 仿真翻页 — 翻书角卷曲效果
 * ================================================================ */
export class PageTurnEngine implements AnimationEngine {
  name = 'page-turn'; label = '仿真翻页'; icon = '📖';
  supportsSwipe = true; isThreeJS = false;
  private animating = false;

  init(container: HTMLElement) {
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
  }

  transition(config: AnimationConfig) {
    if (this.animating) return;
    this.animating = true;
    const { container, images, currentIndex, direction, onComplete } = config;
    const nextIndex = direction === 'next'
      ? (currentIndex + 1) % images.length
      : (currentIndex - 1 + images.length) % images.length;

    const reactImg = hideReactImg(container);
    const rect = container.getBoundingClientRect();

    // 底层：新图片（全尺寸显示）
    const nextEl = createImageEl(images[nextIndex], 15);
    container.appendChild(nextEl);

    // 当前图片：会被翻页覆盖
    const currentEl = createImageEl(images[currentIndex], 20);
    container.appendChild(currentEl);

    // 翻页遮罩层
    const page = document.createElement('div');
    page.style.cssText = `
      position:absolute;top:0;right:0;
      width:100%;height:100%;z-index:25;
      transform-origin:left center;
      transform-style:preserve-3d;
      perspective:1500px;
    `;

    // 翻页的正面（当前图片右半部分）
    const pageFront = document.createElement('div');
    pageFront.style.cssText = `
      position:absolute;top:0;right:0;width:50%;height:100%;
      backface-visibility:hidden;overflow:hidden;
    `;
    const pageFrontImg = document.createElement('img');
    pageFrontImg.src = images[currentIndex];
    pageFrontImg.style.cssText = `
      position:absolute;top:0;height:100%;width:${rect.width}px;
      right:0;object-fit:cover;user-select:none;pointer-events:none;
    `;
    pageFront.appendChild(pageFrontImg);

    // 翻页的背面（新图片左半部分）
    const pageBack = document.createElement('div');
    pageBack.style.cssText = `
      position:absolute;top:0;right:0;width:50%;height:100%;
      backface-visibility:hidden;overflow:hidden;
      transform:rotateY(180deg);
    `;
    const pageBackImg = document.createElement('img');
    pageBackImg.src = images[nextIndex];
    pageBackImg.style.cssText = `
      position:absolute;top:0;height:100%;width:${rect.width}px;
      right:0;object-fit:cover;user-select:none;pointer-events:none;
      transform:scaleX(-1);
    `;
    pageBack.appendChild(pageBackImg);

    page.appendChild(pageFront);
    page.appendChild(pageBack);
    container.appendChild(page);

    // 渐进翻页动画
    let progress = 0;
    const duration = 600;
    const startTime = performance.now();

    const animate = (now: number) => {
      progress = Math.min(1, (now - startTime) / duration);
      const t = easeInOutCubic(progress);
      const angle = t * 180;

      page.style.transform = `rotateY(${direction === 'next' ? -angle : angle}deg)`;

      // 翻页阴影
      const shadow = Math.sin(t * Math.PI) * 0.3;
      page.style.boxShadow = `${direction === 'next' ? '-' : ''}${shadow * 30}px 0 ${shadow * 60}px rgba(0,0,0,${shadow})`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        page.remove(); currentEl.remove(); nextEl.remove();
        showReactImg(reactImg);
        this.animating = false;
        onComplete();
      }
    };
    requestAnimationFrame(animate);
  }

  destroy() { this.animating = false; }
}

/* ================================================================
 * 6. 3D 走马灯 — 环绕式 3D 轮播
 * ================================================================ */
export class Carousel3DEngine implements AnimationEngine {
  name = 'carousel-3d'; label = '3D 走马灯'; icon = '🎠';
  supportsSwipe = true; isThreeJS = false;
  private animating = false;

  init(container: HTMLElement) {
    container.style.position = 'relative';
    container.style.perspective = '1000px';
    container.style.overflow = 'hidden';
  }

  transition(config: AnimationConfig) {
    if (this.animating) return;
    this.animating = true;
    const { container, images, currentIndex, direction, onComplete } = config;
    const total = images.length;
    const nextIndex = direction === 'next'
      ? (currentIndex + 1) % total
      : (currentIndex - 1 + total) % total;

    const reactImg = hideReactImg(container);

    // 计算走马灯中每张图片的位置和旋转
    const radius = 300; // 走马灯半径（px）
    const angleStep = 360 / total;

    const items: HTMLElement[] = [];
    for (let i = 0; i < total; i++) {
      const item = document.createElement('div');
      item.style.cssText = `
        position:absolute;top:50%;left:50%;
        width:200px;height:150px;
        margin-left:-100px;margin-top:-75px;
        transform-style:preserve-3d;
        transition:all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        z-index:${i === currentIndex ? 30 : 10};
      `;

      const img = document.createElement('img');
      img.src = images[i];
      img.style.cssText = `
        width:100%;height:100%;object-fit:cover;
        border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.4);
        user-select:none;pointer-events:none;
      `;
      item.appendChild(img);
      container.appendChild(item);
      items.push(item);
    }

    // 初始位置
    const updatePositions = (baseIndex: number) => {
      items.forEach((item, i) => {
        let offset = i - baseIndex;
        // 循环偏移
        if (offset > total / 2) offset -= total;
        if (offset < -total / 2) offset += total;

        const angle = offset * angleStep;
        const rad = (angle * Math.PI) / 180;
        const x = Math.sin(rad) * radius;
        const z = Math.cos(rad) * radius - radius;
        const scale = 1 - Math.abs(offset) * 0.15;
        const opacity = 1 - Math.abs(offset) * 0.25;
        const zIndex = Math.round((1 - Math.abs(offset) / total) * 100);

        item.style.transform = `translateX(${x}px) translateZ(${z}px) scale(${Math.max(0.5, scale)})`;
        item.style.opacity = String(Math.max(0.3, opacity));
        item.style.zIndex = String(zIndex);
      });
    };

    updatePositions(currentIndex);

    // 动画到下一张
    requestAnimationFrame(() => {
      updatePositions(nextIndex);
    });

    setTimeout(() => {
      items.forEach(el => el.remove());
      showReactImg(reactImg);
      this.animating = false;
      onComplete();
    }, 700);
  }

  destroy() { this.animating = false; }
}

/* ================================================================
 * 工厂 + 模式列表
 * ================================================================ */
export function createAnimationEngine(mode: AnimationMode): AnimationEngine {
  switch (mode) {
    case 'spatial-rift': return new SpatialRiftEngine();
    case 'card-flip': return new CardFlipEngine();
    case 'slide-switch': return new SlideSwitchEngine();
    case 'fade-zoom': return new FadeZoomEngine();
    case 'page-turn': return new PageTurnEngine();
    case 'carousel-3d': return new Carousel3DEngine();
    default: return new SpatialRiftEngine();
  }
}

export const ANIMATION_MODES: { value: AnimationMode; label: string; icon: string; desc: string }[] = [
  { value: 'spatial-rift', label: '时空裂隙', icon: '🌌', desc: '动态模糊甩出 + 速度线粒子' },
  { value: 'card-flip', label: '卡片翻转', icon: '🃏', desc: '3D 正反面翻牌效果' },
  { value: 'slide-switch', label: '滑动切换', icon: '➡️', desc: '水平滑入滑出过渡' },
  { value: 'fade-zoom', label: '淡入缩放', icon: '🔍', desc: '旧图缩小淡出 + 新图放大淡入' },
  { value: 'page-turn', label: '仿真翻页', icon: '📖', desc: '翻书角卷曲翻页效果' },
  { value: 'carousel-3d', label: '3D 走马灯', icon: '🎠', desc: '环绕式 3D 环形轮播' },
];
