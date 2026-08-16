/**
 * 照片墙动画引擎 - 5 种高级翻页动画
 * 每种动画封装为独立函数，便于维护
 */

// 通用类型
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
}

// ===== 1. 时空裂隙（动态模糊甩出 + Canvas 速度线） =====
export class SpatialRiftEngine implements AnimationEngine {
  name = 'spatial-rift';
  label = '时空裂隙';
  icon = '🌌';
  supportsSwipe = true;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animating = false;

  init(container: HTMLElement, images: string[]) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;';
    container.style.position = 'relative';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx?.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  transition(config: AnimationConfig) {
    if (this.animating) return;
    this.animating = true;
    const { container, images, currentIndex, direction, onComplete } = config;
    const nextIndex = direction === 'next'
      ? (currentIndex + 1) % images.length
      : (currentIndex - 1 + images.length) % images.length;

    // 创建当前图和下图的 DOM
    const currentEl = this.createImageEl(images[currentIndex], container);
    const nextEl = this.createImageEl(images[nextIndex], container);
    nextEl.style.opacity = '0';

    const angle = direction === 'next' ? -30 : 30;
    const exitAngle = -angle;

    // 速度线粒子
    const particles = this.createSpeedLines(8);

    // 当前图甩出
    currentEl.style.transition = 'all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    currentEl.style.transform = `rotate(${angle}deg) translate(${direction === 'next' ? '-120%' : '120%'}, -30%)`;
    currentEl.style.filter = 'blur(8px)';
    currentEl.style.opacity = '0.3';

    // 残影
    const ghost = currentEl.cloneNode(true) as HTMLElement;
    ghost.style.opacity = '0.2';
    ghost.style.filter = 'blur(4px)';
    ghost.style.transition = 'all 0.4s ease-out';
    container.appendChild(ghost);

    // 新图飞入
    setTimeout(() => {
      nextEl.style.transition = 'all 0.4s cubic-bezier(0.19, 1, 0.22, 1)'; // power4.out
      nextEl.style.opacity = '1';
      nextEl.style.transform = `rotate(${-exitAngle}deg) translate(0, 0)`;
    }, 100);

    // 绘制速度线
    this.animateSpeedLines(particles);

    // 清理
    setTimeout(() => {
      currentEl.remove();
      ghost.style.opacity = '0';
      setTimeout(() => ghost.remove(), 300);
      this.clearCanvas();
      this.animating = false;
      onComplete();
    }, 500);
  }

  private createImageEl(url: string, container: HTMLElement): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transition:all 0.35s ease;`;
    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.4);';
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
        angle: -30 + Math.random() * 10,
        length: 50 + Math.random() * 100,
        speed: 2 + Math.random() * 3,
        opacity: 0.3 + Math.random() * 0.4
      });
    }
    return lines;
  }

  private animateSpeedLines(lines: ReturnType<typeof this.createSpeedLines>) {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width / window.devicePixelRatio;
    const h = this.canvas.height / window.devicePixelRatio;
    let frame = 0;
    const maxFrames = 20;

    const draw = () => {
      if (frame >= maxFrames) return;
      this.clearCanvas();
      lines.forEach(line => {
        const progress = frame / maxFrames;
        const x = (line.x / 100) * w + progress * line.speed * 50;
        const y = (line.y / 100) * h;
        const rad = (line.angle * Math.PI) / 180;
        const endX = x + Math.cos(rad) * line.length * (1 - progress * 0.5);
        const endY = y + Math.sin(rad) * line.length * (1 - progress * 0.5);

        this.ctx!.beginPath();
        this.ctx!.moveTo(x, y);
        this.ctx!.lineTo(endX, endY);
        this.ctx!.strokeStyle = `rgba(255,255,255,${line.opacity * (1 - progress)})`;
        this.ctx!.lineWidth = 1.5;
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
    this.canvas?.remove();
    this.canvas = null;
    this.ctx = null;
  }
}

// ===== 2. 魔方拆解（Three.js 4x4 网格 3D 旋转） =====
export class MagicCubeEngine implements AnimationEngine {
  name = 'magic-cube';
  label = '魔方拆解';
  icon = '🧊';
  supportsSwipe = false; // 3D 场景中用内部交互
  private threeScene: any = null;

  init(container: HTMLElement, images: string[]) {
    // Three.js 在 React 组件中通过 R3F 管理，这里仅标记
    container.dataset.animationMode = 'magic-cube';
  }

  transition(config: AnimationConfig) {
    // 由 R3F 组件内部处理
    config.onComplete();
  }

  destroy() {
    this.threeScene = null;
  }
}

// ===== 3. 液态玻璃（Three.js ShaderMaterial 水波折射） =====
export class LiquidGlassEngine implements AnimationEngine {
  name = 'liquid-glass';
  label = '液态玻璃';
  icon = '💧';
  supportsSwipe = false;

  init(container: HTMLElement, images: string[]) {
    container.dataset.animationMode = 'liquid-glass';
  }

  transition(config: AnimationConfig) {
    config.onComplete();
  }

  destroy() {}
}

// ===== 4. 无限景深（Z 轴穿梭 + 粒子星空） =====
export class InfiniteDepthEngine implements AnimationEngine {
  name = 'infinite-depth';
  label = '无限景深';
  icon = '🚀';
  supportsSwipe = false;

  init(container: HTMLElement, images: string[]) {
    container.dataset.animationMode = 'infinite-depth';
  }

  transition(config: AnimationConfig) {
    config.onComplete();
  }

  destroy() {}
}

// ===== 5. 多米诺波（GSAP 切片倾倒） =====
export class DominoWaveEngine implements AnimationEngine {
  name = 'domino-wave';
  label = '多米诺波';
  icon = '🀄';
  supportsSwipe = true;
  private animating = false;

  init(container: HTMLElement, images: string[]) {
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

    const SLICES = 30;
    const DELAY_PER_SLICE = 40;
    const DURATION = 600;
    const rect = container.getBoundingClientRect();
    const sliceWidth = 100 / SLICES;

    // 渲染当前图切片
    const currentSlices: HTMLElement[] = [];
    for (let i = 0; i < SLICES; i++) {
      const slice = document.createElement('div');
      slice.style.cssText = `
        position:absolute;top:0;height:100%;width:${sliceWidth}%;
        left:${i * sliceWidth}%;overflow:hidden;
        transform-origin:center center;transform-style:preserve-3d;
        perspective:800px;
      `;
      const img = document.createElement('img');
      img.src = images[currentIndex];
      img.style.cssText = `
        position:absolute;top:0;height:100%;width:${rect.width}px;
        left:${-i * (rect.width / SLICES)}px;
        object-fit:cover;border-radius:16px;
      `;
      slice.appendChild(img);
      container.appendChild(slice);
      currentSlices.push(slice);
    }

    // 下一整张图（底层）
    const nextEl = document.createElement('div');
    nextEl.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;';
    const nextImg = document.createElement('img');
    nextImg.src = images[nextIndex];
    nextImg.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.4);';
    nextEl.appendChild(nextImg);
    container.appendChild(nextEl);

    // GSAP-like 手动动画
    currentSlices.forEach((slice, i) => {
      const delay = i * DELAY_PER_SLICE;
      setTimeout(() => {
        slice.style.transition = `transform ${DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1)`; // easeOutBack
        slice.style.transform = `rotateY(${direction === 'next' ? 180 : -180}deg)`;
      }, delay);
    });

    // 清理
    const totalDuration = SLICES * DELAY_PER_SLICE + DURATION + 100;
    setTimeout(() => {
      currentSlices.forEach(s => s.remove());
      this.animating = false;
      onComplete();
    }, totalDuration);
  }

  destroy() {}
}

// ===== 工厂函数 =====
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
  { value: 'magic-cube', label: '魔方拆解', icon: '🧊', desc: '4x4 网格 3D 旋转散开聚合' },
  { value: 'liquid-glass', label: '液态玻璃', icon: '💧', desc: '水波折射 + 镜面高光扫描' },
  { value: 'infinite-depth', label: '无限景深', icon: '🚀', desc: 'Z 轴穿梭 + 粒子星空泛光' },
  { value: 'domino-wave', label: '多米诺波', icon: '🀄', desc: '切片倾倒 + 回弹效果' },
];
