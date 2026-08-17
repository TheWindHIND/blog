/**
 * 照片墙动画引擎 - 2 种 CSS 动画 + 3 种 Three.js 标记
 * 1. 时空裂隙（SpatialRift）   — CSS 动态模糊 + Canvas 速度线 + 残影拖尾
 * 5. 多米诺波（DominoWave）    — 30 条切片依次 Y 轴旋转 180° + easeOutBack 回弹
 *
 * 2/3/4 为 Three.js 模式，实际渲染由 ThreeAnimations.tsx 处理
 */

export type AnimationMode = 'spatial-rift' | 'magic-cube' | 'liquid-glass' | 'infinite-depth' | 'domino-wave';

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

  init(container: HTMLElement, _images: string[]) {
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

    const reactImg = container.querySelector('img[data-react-static]') as HTMLElement | null;
    if (reactImg) reactImg.style.opacity = '0';

    const currentEl = this.createImageEl(images[currentIndex], container, 20);
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

    const nextEl = this.createImageEl(images[nextIndex], container, 21);
    const enterAngle = -exitAngle;
    nextEl.style.transform = `rotate(${enterAngle}deg) translate(${direction === 'next' ? '120%' : '-120%'}, 30%)`;
    nextEl.style.opacity = '0';

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
      currentEl.remove();
      ghost.remove();
      this.clearCanvas();
      if (reactImg) reactImg.style.opacity = '1';
      this.animating = false;
      onComplete();
    }, 600);
  }

  private createImageEl(url: string, container: HTMLElement, zIndex: number): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:${zIndex};will-change:transform,filter,opacity;`;
    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.5);user-select:none;pointer-events:none;';
    el.appendChild(img);
    container.appendChild(el);
    return el;
  }

  private createSpeedLines(count: number) {
    const lines: { x: number; y: number; angle: number; length: number; speed: number; opacity: number }[] = [];
    for (let i = 0; i < count; i++) {
      lines.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        angle: -25 + Math.random() * 15,
        length: 60 + Math.random() * 120,
        speed: 3 + Math.random() * 4,
        opacity: 0.2 + Math.random() * 0.5,
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
        const endX = x + Math.cos(rad) * len;
        const endY = y + Math.sin(rad) * len;

        this.ctx!.beginPath();
        this.ctx!.moveTo(x, y);
        this.ctx!.lineTo(endX, endY);
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
    this.canvas = null;
    this.ctx = null;
    this.animating = false;
  }
}

/* ================================================================
 * 5. 多米诺波 — 30 条切片依次 Y 轴旋转 180° + easeOutBack 回弹
 *    每个切片是图片的一个垂直条带，倾倒后背面显示下一张图片
 * ================================================================ */
export class DominoWaveEngine implements AnimationEngine {
  name = 'domino-wave';
  label = '多米诺波';
  icon = '🀄';
  supportsSwipe = true;
  isThreeJS = false;
  private animating = false;
  private cleanupElements: HTMLElement[] = [];
  private container: HTMLElement | null = null;
  private totalSlices = 30;

  init(container: HTMLElement, _images: string[]) {
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    this.container = container;
  }

  transition(config: AnimationConfig) {
    if (this.animating) return;
    this.animating = true;

    const { container, images, currentIndex, direction, onComplete } = config;
    const nextIndex = direction === 'next'
      ? (currentIndex + 1) % images.length
      : (currentIndex - 1 + images.length) % images.length;

    const SLICES = this.totalSlices;
    const DELAY_PER_SLICE = 35; // ms
    const DURATION = 500; // ms per slice
    const rect = container.getBoundingClientRect();
    const sliceWidthPx = rect.width / SLICES;
    const sliceWidthPercent = 100 / SLICES;

    // 隐藏 React 静态图
    const reactImg = container.querySelector('img[data-react-static]') as HTMLElement | null;
    if (reactImg) reactImg.style.opacity = '0';

    this.cleanupElements = [];

    // 创建切片：每个切片包含当前图片的一个条带（正面）和下一张图片的对应条带（背面）
    for (let i = 0; i < SLICES; i++) {
      // 外层切片容器（控制 3D 翻转）
      const slice = document.createElement('div');
      slice.style.cssText = `
        position:absolute;top:0;height:100%;width:${sliceWidthPercent}%;
        left:${i * sliceWidthPercent}%;
        transform-style:preserve-3d;
        perspective:1000px;
        z-index:20;
      `;

      // 正面：当前图片的条带
      const front = document.createElement('div');
      front.style.cssText = `
        position:absolute;inset:0;
        backface-visibility:hidden;
        overflow:hidden;
        transform:rotateY(0deg);
      `;
      const frontImg = document.createElement('img');
      frontImg.src = images[currentIndex];
      frontImg.style.cssText = `
        position:absolute;top:0;left:${-i * sliceWidthPx}px;
        width:${rect.width}px;height:100%;
        object-fit:cover;
        user-select:none;pointer-events:none;
      `;
      front.appendChild(frontImg);

      // 背面：下一张图片的条带
      const back = document.createElement('div');
      back.style.cssText = `
        position:absolute;inset:0;
        backface-visibility:hidden;
        overflow:hidden;
        transform:rotateY(180deg);
      `;
      const backImg = document.createElement('img');
      backImg.src = images[nextIndex];
      backImg.style.cssText = `
        position:absolute;top:0;left:${-i * sliceWidthPx}px;
        width:${rect.width}px;height:100%;
        object-fit:cover;
        user-select:none;pointer-events:none;
      `;
      back.appendChild(backImg);

      slice.appendChild(front);
      slice.appendChild(back);
      container.appendChild(slice);
      this.cleanupElements.push(slice);
    }

    // 切片依次倾倒（easeOutBack = cubic-bezier(0.34, 1.56, 0.64, 1)）
    this.cleanupElements.forEach((slice, i) => {
      const delay = i * DELAY_PER_SLICE;
      setTimeout(() => {
        slice.style.transition = `transform ${DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
        slice.style.transform = `rotateY(${direction === 'next' ? -180 : 180}deg)`;
      }, delay);
    });

    // 清理
    const totalDuration = SLICES * DELAY_PER_SLICE + DURATION + 200;
    setTimeout(() => {
      this.cleanupElements.forEach(el => el.remove());
      this.cleanupElements = [];
      if (reactImg) reactImg.style.opacity = '1';
      this.animating = false;
      onComplete();
    }, totalDuration);
  }

  destroy() {
    this.cleanupElements.forEach(el => el.remove());
    this.cleanupElements = [];
    this.animating = false;
  }
}

/* ================================================================
 * 2/3/4. Three.js 引擎标记（实际渲染由 React R3F 组件处理）
 * ================================================================ */
export class MagicCubeEngine implements AnimationEngine {
  name = 'magic-cube'; label = '魔方拆解'; icon = '🧊';
  supportsSwipe = false; isThreeJS = true;
  init() {} transition(config: AnimationConfig) { config.onComplete(); } destroy() {}
}

export class LiquidGlassEngine implements AnimationEngine {
  name = 'liquid-glass'; label = '液态玻璃'; icon = '💧';
  supportsSwipe = false; isThreeJS = true;
  init() {} transition(config: AnimationConfig) { config.onComplete(); } destroy() {}
}

export class InfiniteDepthEngine implements AnimationEngine {
  name = 'infinite-depth'; label = '无限景深'; icon = '🚀';
  supportsSwipe = false; isThreeJS = true;
  init() {} transition(config: AnimationConfig) { config.onComplete(); } destroy() {}
}

/* ================================================================
 * 工厂
 * ================================================================ */
export function createAnimationEngine(mode: AnimationMode): AnimationEngine {
  switch (mode) {
    case 'spatial-rift': return new SpatialRiftEngine();
    case 'magic-cube': return new MagicCubeEngine();
    case 'liquid-glass': return new LiquidGlassEngine();
    case 'infinite-depth': return new InfiniteDepthEngine();
    case 'domino-wave': return new DominoWaveEngine();
    default: return new SpatialRiftEngine();
  }
}

export const ANIMATION_MODES: { value: AnimationMode; label: string; icon: string; desc: string }[] = [
  { value: 'spatial-rift', label: '时空裂隙', icon: '🌌', desc: '动态模糊甩出 + 速度线粒子' },
  { value: 'magic-cube', label: '魔方拆解', icon: '🧊', desc: '单图 4×4 切割 + 3D 旋转散开聚合' },
  { value: 'liquid-glass', label: '液态玻璃', icon: '💧', desc: '鼠标停留处水波纹折射效果' },
  { value: 'infinite-depth', label: '无限景深', icon: '🚀', desc: '照片穿梭飞近后退 + 粒子星空' },
  { value: 'domino-wave', label: '多米诺波', icon: '🀄', desc: '30 切片依次倾倒 + 物理回弹' },
];
