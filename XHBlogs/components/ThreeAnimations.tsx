"use client";

/**
 * 三种 Three.js 照片墙动画组件
 * 2. 魔方拆解 — 单张图片 UV 切割为 4×4 网格，3D 旋转散开/聚合
 * 3. 液态玻璃 — 鼠标停留处水波纹折射效果
 * 4. 无限景深 — 照片从远处飞近铺满 → 缩小后退 → 循环穿梭
 */

import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

/* ================================================================
 * 2. 魔方拆解 — 单张图片 UV 切割为 4×4，3D 旋转散开/聚合
 * ================================================================ */

// 为每个切片创建独立的 UV 坐标
function createGridUVs(gridSize: number): Float32Array[] {
  const uvs: Float32Array[] = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const u0 = col / gridSize;
      const u1 = (col + 1) / gridSize;
      const v0 = 1 - (row + 1) / gridSize; // WebGL UV 的 v 轴是从下到上
      const v1 = 1 - row / gridSize;
      // planeGeometry 的顶点顺序：左下、右下、左上、右上
      const uv = new Float32Array([
        u0, v0,  // 左下
        u1, v0,  // 右下
        u0, v1,  // 左上
        u1, v1,  // 右上
      ]);
      uvs.push(uv);
    }
  }
  return uvs;
}

function CubeGrid({ imageUrl, nextImageUrl, direction, isTransitioning, onTransitionEnd }: {
  imageUrl: string; nextImageUrl: string | null;
  direction: 'next' | 'prev'; isTransitioning: boolean;
  onTransitionEnd?: () => void;
}) {
  const meshRefs = useRef<THREE.Mesh[]>([]);
  const [phase, setPhase] = useState<'idle' | 'explode' | 'assemble'>('idle');
  const progressRef = useRef(0);
  const gridSize = 4;
  const total = gridSize * gridSize;
  const completedRef = useRef(false);

  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(imageUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [imageUrl]);

  const nextTexture = useMemo(() => {
    if (!nextImageUrl) return null;
    const loader = new THREE.TextureLoader();
    const tex = loader.load(nextImageUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [nextImageUrl]);

  // 为每个切片创建 UV 坐标
  const gridUVs = useMemo(() => createGridUVs(gridSize), []);

  useEffect(() => {
    if (isTransitioning) {
      setPhase('explode');
      progressRef.current = 0;
      completedRef.current = false;
    }
  }, [isTransitioning]);

  // 计算每个切片的网格位置
  const meshes = useMemo(() => {
    const arr: { position: [number, number, number]; uvOffset: [number, number] }[] = [];
    const cellSize = 2 / gridSize;
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        arr.push({
          position: [
            (x - (gridSize - 1) / 2) * cellSize,
            ((gridSize - 1) / 2 - y) * cellSize,
            0,
          ],
          uvOffset: [x / gridSize, y / gridSize],
        });
      }
    }
    return arr;
  }, []);

  // 随机散开目标
  const explodeTargets = useMemo(() => {
    return meshes.map(() => ({
      rx: Math.PI * 4, // 720°
      tx: (Math.random() - 0.5) * 4,
      ty: (Math.random() - 0.5) * 4,
      tz: (Math.random() - 0.5) * 2 - 1,
      delay: Math.random() * 0.4,
    }));
  }, [meshes]);

  useFrame((_, delta) => {
    if (phase === 'explode') {
      progressRef.current = Math.min(1, progressRef.current + delta * 1.5);
      const p = progressRef.current;

      meshRefs.current.forEach((mesh, i) => {
        if (!mesh) return;
        const target = explodeTargets[i];
        const localP = Math.max(0, Math.min(1, (p - target.delay) / (1 - target.delay)));
        const t = 1 - Math.pow(1 - localP, 3);

        mesh.rotation.y = t * target.rx;
        mesh.position.x = meshes[i].position[0] + t * target.tx;
        mesh.position.y = meshes[i].position[1] + t * target.ty;
        mesh.position.z = t * target.tz;
        (mesh.material as THREE.MeshStandardMaterial).opacity = 1 - t * 0.3;
      });

      if (p >= 1) {
        setPhase('assemble');
        progressRef.current = 0;
        // 切换纹理到下一张
        if (nextTexture) {
          meshRefs.current.forEach(mesh => {
            if (mesh) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              mat.map = nextTexture;
              mat.needsUpdate = true;
            }
          });
        }
      }
    } else if (phase === 'assemble') {
      progressRef.current = Math.min(1, progressRef.current + delta * 1.5);
      const p = progressRef.current;

      meshRefs.current.forEach((mesh, i) => {
        if (!mesh) return;
        const target = explodeTargets[i];
        const localP = Math.max(0, Math.min(1, (p - target.delay) / (1 - target.delay)));
        const t = 1 - Math.pow(1 - localP, 3);

        mesh.rotation.y = (1 - t) * target.rx;
        mesh.position.x = meshes[i].position[0] + (1 - t) * target.tx;
        mesh.position.y = meshes[i].position[1] + (1 - t) * target.ty;
        mesh.position.z = (1 - t) * target.tz;
        (mesh.material as THREE.MeshStandardMaterial).opacity = 0.7 + t * 0.3;
      });

      if (p >= 1 && !completedRef.current) {
        completedRef.current = true;
        setPhase('idle');
        onTransitionEnd?.();
      }
    }
  });

  return (
    <>
      {meshes.map((m, i) => {
        // 创建独立的 geometry 并设置 UV
        return (
          <mesh
            key={i}
            ref={el => { if (el) meshRefs.current[i] = el; }}
            position={m.position}
          >
            <planeGeometry args={[2 / gridSize, 2 / gridSize]}>
              <bufferAttribute
                attach="attributes-uv"
                args={[gridUVs[i], 2]}
              />
            </planeGeometry>
            <meshStandardMaterial
              map={texture}
              transparent
              opacity={1}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </>
  );
}

export function MagicCubeScene({ imageUrl, nextImageUrl, direction, isTransitioning, onTransitionEnd }: {
  imageUrl: string; nextImageUrl: string | null;
  direction: 'next' | 'prev'; isTransitioning: boolean;
  onTransitionEnd?: () => void;
}) {
  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 50 }} style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />
      <CubeGrid
        imageUrl={imageUrl}
        nextImageUrl={nextImageUrl}
        direction={direction}
        isTransitioning={isTransitioning}
        onTransitionEnd={onTransitionEnd}
      />
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  );
}

/* ================================================================
 * 3. 液态玻璃 — 鼠标停留处水波纹折射
 * ================================================================ */

const liquidGlassVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const liquidGlassFragmentShader = `
  uniform sampler2D uTexture1;
  uniform sampler2D uTexture2;
  uniform float uProgress;
  uniform float uTime;
  uniform vec2 uMouse;       // 鼠标 UV 坐标 (0~1)
  uniform float uMouseActive; // 鼠标是否在画面上 (0 or 1)
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // 鼠标位置的水波纹效果
    float dist = distance(uv, uMouse);
    float ripple = 0.0;

    if (uMouseActive > 0.5) {
      // 多层同心波纹
      float wave1 = sin(dist * 30.0 - uTime * 4.0) * 0.008;
      float wave2 = sin(dist * 20.0 - uTime * 3.0) * 0.005;
      float wave3 = sin(dist * 40.0 - uTime * 5.0) * 0.003;

      // 距离衰减：靠近鼠标处效果更强
      float attenuation = smoothstep(0.4, 0.0, dist);
      ripple = (wave1 + wave2 + wave3) * attenuation;

      // 添加轻微的径向扭曲
      vec2 dir = normalize(uv - uMouse + 0.001);
      float radialDistort = sin(dist * 15.0 - uTime * 3.0) * 0.005 * attenuation;
      uv += dir * radialDistort;
    }

    // 应用波纹位移
    uv += vec2(ripple, ripple * 0.7);

    // 轻微的全局呼吸效果（降低强度）
    float breathNoise = sin(uv.x * 5.0 + uTime * 0.5) * sin(uv.y * 5.0 + uTime * 0.3) * 0.002;
    uv += vec2(breathNoise, breathNoise * 0.5);

    vec4 tex1 = texture2D(uTexture1, uv);
    vec4 tex2 = texture2D(uTexture2, uv);

    // 混合（降低对比度）
    vec4 color = mix(tex1, tex2, uProgress);

    // 鼠标处的液态高光
    if (uMouseActive > 0.5) {
      float highlight = smoothstep(0.15, 0.0, dist) * 0.15;
      // 模拟玻璃折射高光
      float glassHighlight = sin(dist * 25.0 - uTime * 6.0) * smoothstep(0.2, 0.0, dist) * 0.1;
      color.rgb += vec3(highlight + glassHighlight) * vec3(0.9, 0.95, 1.0);
    }

    // 轻微降低整体饱和度（液态玻璃感觉）
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(vec3(gray), color.rgb, 0.85);

    gl_FragColor = color;
  }
`;

function LiquidGlassPlane({ imageUrl, nextImageUrl, isTransitioning, onTransitionEnd }: {
  imageUrl: string; nextImageUrl: string | null;
  isTransitioning: boolean; onTransitionEnd?: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const mouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const mouseActiveRef = useRef(0);
  const { size, pointer } = useThree();

  const tex1 = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const t = loader.load(imageUrl); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [imageUrl]);

  const tex2 = useMemo(() => {
    if (!nextImageUrl) return null;
    const loader = new THREE.TextureLoader();
    const t = loader.load(nextImageUrl); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [nextImageUrl]);

  const uniforms = useMemo(() => ({
    uTexture1: { value: tex1 },
    uTexture2: { value: tex2 || tex1 },
    uProgress: { value: 0 },
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uMouseActive: { value: 0 },
  }), [tex1, tex2]);

  useEffect(() => {
    if (isTransitioning && nextImageUrl) {
      uniforms.uTexture2.value = tex2 || tex1;
      progressRef.current = 0;
      setIsAnimating(true);
    }
  }, [isTransitioning, nextImageUrl, tex2, tex1, uniforms]);

  // 更新鼠标位置
  useFrame((state, delta) => {
    uniforms.uTime.value += delta;

    // R3F 的 pointer 已经是 NDC (-1~1)，转换为 UV (0~1)
    const mx = (pointer.x + 1) / 2;
    const my = (pointer.y + 1) / 2;
    // 平滑跟随
    mouseRef.current.x += (mx - mouseRef.current.x) * 0.1;
    mouseRef.current.y += (my - mouseRef.current.y) * 0.1;
    uniforms.uMouse.value.copy(mouseRef.current);

    // 检测鼠标是否在画面上（通过 raycaster）
    // 简单方案：pointer 在 -1~1 范围内且有移动
    const isPointerInScene = Math.abs(pointer.x) <= 1 && Math.abs(pointer.y) <= 1;
    mouseActiveRef.current += ((isPointerInScene ? 1 : 0) - mouseActiveRef.current) * 0.1;
    uniforms.uMouseActive.value = mouseActiveRef.current;

    if (isAnimating) {
      progressRef.current += delta * 0.8;
      if (progressRef.current >= 1) {
        progressRef.current = 1;
        setIsAnimating(false);
        uniforms.uTexture1.value = uniforms.uTexture2.value;
        uniforms.uProgress.value = 0;
        progressRef.current = 0;
        onTransitionEnd?.();
      } else {
        uniforms.uProgress.value = progressRef.current;
      }
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[4, 2.5]} />
      <shaderMaterial
        vertexShader={liquidGlassVertexShader}
        fragmentShader={liquidGlassFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export function LiquidGlassScene({ imageUrl, nextImageUrl, isTransitioning, onTransitionEnd }: {
  imageUrl: string; nextImageUrl: string | null;
  isTransitioning: boolean; onTransitionEnd?: () => void;
}) {
  return (
    <Canvas camera={{ position: [0, 0, 3], fov: 50 }} style={{ width: '100%', height: '100%' }}>
      <LiquidGlassPlane
        imageUrl={imageUrl}
        nextImageUrl={nextImageUrl}
        isTransitioning={isTransitioning}
        onTransitionEnd={onTransitionEnd}
      />
    </Canvas>
  );
}

/* ================================================================
 * 4. 无限景深 — 照片从远处飞近 → 缩小后退 → 循环穿梭
 * ================================================================ */

function StarParticles() {
  const count = 500;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 2] = -Math.random() * 60;
    }
    return arr;
  }, []);

  const ref = useRef<THREE.Points>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.02;
      // 星星缓慢向前移动，增强穿梭感
      ref.current.position.z += delta * 0.5;
      if (ref.current.position.z > 10) ref.current.position.z = -50;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.05} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

function FloatingPhotos({ images, currentIndex, nextIndex, isTransitioning, onTransitionEnd }: {
  images: string[]; currentIndex: number; nextIndex: number | null;
  isTransitioning: boolean; onTransitionEnd?: () => void;
}) {
  const currentPhotoRef = useRef<THREE.Mesh>(null);
  const nextPhotoRef = useRef<THREE.Mesh>(null);
  const transitionProgress = useRef(0);
  const animatingRef = useRef(false);

  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return images.map(url => {
      const t = loader.load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    });
  }, [images]);

  // 当 currentIndex 变化且非动画中时，更新当前照片的纹理
  useEffect(() => {
    if (!animatingRef.current && currentPhotoRef.current) {
      const mat = currentPhotoRef.current.material as THREE.MeshStandardMaterial;
      mat.map = textures[currentIndex];
      mat.needsUpdate = true;
      currentPhotoRef.current.position.set(0, 0, 0);
      currentPhotoRef.current.scale.set(1, 1, 1);
      mat.opacity = 1;
    }
  }, [currentIndex, textures]);

  // 触发动画开始
  useEffect(() => {
    if (isTransitioning && nextIndex !== null) {
      animatingRef.current = true;
      transitionProgress.current = 0;
      if (nextPhotoRef.current) {
        const mat = nextPhotoRef.current.material as THREE.MeshStandardMaterial;
        mat.map = textures[nextIndex];
        mat.needsUpdate = true;
        nextPhotoRef.current.position.set(0, 0, 10);
        nextPhotoRef.current.scale.set(3, 3, 1);
        mat.opacity = 0;
      }
    }
  }, [isTransitioning, nextIndex, textures]);

  useFrame(({ camera }, delta) => {
    if (animatingRef.current) {
      transitionProgress.current += delta * 0.8; // 更慢的动画速度
      const t = Math.min(1, transitionProgress.current);

      // Phase 1 (0~0.5): 当前照片缩小后退 + 淡出
      if (t <= 0.5) {
        const p = t / 0.5; // 0~1
        const eased = 1 - Math.pow(1 - p, 2);
        if (currentPhotoRef.current) {
          const scale = 1 - eased * 0.7; // 1 → 0.3
          currentPhotoRef.current.scale.set(scale, scale, 1);
          currentPhotoRef.current.position.z = -eased * 8;
          (currentPhotoRef.current.material as THREE.MeshStandardMaterial).opacity = 1 - eased * 0.8;
        }
      }

      // Phase 2 (0.3~1): 新照片从远处飞近铺满
      if (t >= 0.3 && nextPhotoRef.current) {
        const p = Math.min(1, (t - 0.3) / 0.7); // 0~1
        const eased = 1 - Math.pow(1 - p, 3);
        const scale = 3 - eased * 2; // 3 → 1
        nextPhotoRef.current.scale.set(scale, scale, 1);
        nextPhotoRef.current.position.z = 10 - eased * 10; // 10 → 0
        (nextPhotoRef.current.material as THREE.MeshStandardMaterial).opacity = Math.min(1, eased * 1.5);
      }

      if (t >= 1) {
        animatingRef.current = false;
        transitionProgress.current = 0;
        // 将 nextPhoto 的纹理复制给 currentPhoto
        if (nextPhotoRef.current && currentPhotoRef.current && nextIndex !== null) {
          const nextMat = nextPhotoRef.current.material as THREE.MeshStandardMaterial;
          const curMat = currentPhotoRef.current.material as THREE.MeshStandardMaterial;
          curMat.map = nextMat.map;
          curMat.needsUpdate = true;
          currentPhotoRef.current.position.set(0, 0, 0);
          currentPhotoRef.current.scale.set(1, 1, 1);
          curMat.opacity = 1;
          // 隐藏 nextPhoto
          nextPhotoRef.current.position.set(0, 0, 10);
          nextPhotoRef.current.scale.set(3, 3, 1);
          nextMat.opacity = 0;
        }
        onTransitionEnd?.();
      }
    }

    // 相机轻微浮动
    camera.position.x = Math.sin(Date.now() * 0.0003) * 0.1;
    camera.position.y = Math.cos(Date.now() * 0.0004) * 0.05;
  });

  // 生成背景照片位置（固定种子避免重渲染时位置变化）
  const bgPositions = useMemo(() => {
    return images.map((_, i) => ({
      x: Math.sin(i * 2.399) * 3, // 黄金角分布
      y: Math.cos(i * 2.399) * 2,
      z: -3 - i * 1.5,
    }));
  }, [images]);

  return (
    <group>
      {/* 背景照片（非当前/下一张的远景） */}
      {images.map((url, i) => {
        if (i === currentIndex || i === nextIndex) return null;
        const pos = bgPositions[i];
        return (
          <mesh key={`bg-${i}`} position={[pos.x, pos.y, pos.z]}>
            <planeGeometry args={[1.6, 1.2]} />
            <meshStandardMaterial map={textures[i]} transparent opacity={0.15} side={THREE.DoubleSide} />
          </mesh>
        );
      })}

      {/* 当前照片 */}
      <mesh
        key="current-photo"
        ref={currentPhotoRef}
        position={[0, 0, 0]}
      >
        <planeGeometry args={[3.2, 2]} />
        <meshStandardMaterial map={textures[currentIndex]} transparent opacity={1} side={THREE.DoubleSide} />
      </mesh>

      {/* 下一张照片 — 始终存在（隐藏在远处） */}
      <mesh
        key="next-photo"
        ref={nextPhotoRef}
        position={[0, 0, 10]}
        scale={[3, 3, 1]}
      >
        <planeGeometry args={[3.2, 2]} />
        <meshStandardMaterial
          map={nextIndex !== null ? textures[nextIndex] : textures[0]}
          transparent opacity={0} side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

import { EffectComposer, Bloom } from '@react-three/postprocessing';

export function InfiniteDepthScene({ images, currentIndex, nextIndex, isTransitioning, onTransitionEnd }: {
  images: string[]; currentIndex: number; nextIndex: number | null;
  isTransitioning: boolean; onTransitionEnd?: () => void;
}) {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 60 }} style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 5]} intensity={1} />
      <StarParticles />
      <FloatingPhotos
        images={images}
        currentIndex={currentIndex}
        nextIndex={nextIndex}
        isTransitioning={isTransitioning}
        onTransitionEnd={onTransitionEnd}
      />
      <EffectComposer>
        <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.9} intensity={0.4} />
      </EffectComposer>
    </Canvas>
  );
}
