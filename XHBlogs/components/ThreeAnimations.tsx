"use client";

/**
 * 三种 Three.js 照片墙动画组件
 * 2. 魔方拆解 — 4×4 网格 3D 旋转散开/聚合
 * 3. 液态玻璃 — ShaderMaterial 水波折射
 * 4. 无限景深 — Z 轴穿梭 + 粒子星空 + Bloom
 */

import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Float } from '@react-three/drei';
import * as THREE from 'three';

/* ================================================================
 * 2. 魔方拆解 — 4×4 网格 3D 旋转
 * ================================================================ */
function CubeGrid({ imageUrl, nextImageUrl, direction, isTransitioning }: {
  imageUrl: string; nextImageUrl: string | null;
  direction: 'next' | 'prev'; isTransitioning: boolean;
}) {
  const meshRefs = useRef<THREE.Mesh[]>([]);
  const [phase, setPhase] = useState<'idle' | 'explode' | 'assemble'>('idle');
  const progressRef = useRef(0);
  const gridSize = 4;
  const total = gridSize * gridSize;

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

  useEffect(() => {
    if (isTransitioning) {
      setPhase('explode');
      progressRef.current = 0;
    }
  }, [isTransitioning]);

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
        // easeOutCubic
        const t = 1 - Math.pow(1 - localP, 3);

        mesh.rotation.y = t * target.rx;
        mesh.position.x = meshes[i].position[0] + t * target.tx;
        mesh.position.y = meshes[i].position[1] + t * target.ty;
        mesh.position.z = t * target.tz;
        mesh.material.opacity = 1 - t * 0.3;
      });

      if (p >= 1) {
        setPhase('assemble');
        progressRef.current = 0;
        // 切换纹理
        if (nextTexture) {
          meshRefs.current.forEach(mesh => {
            if (mesh) (mesh.material as THREE.MeshStandardMaterial).map = nextTexture;
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
        mesh.material.opacity = 0.7 + t * 0.3;
      });

      if (p >= 1) setPhase('idle');
    }
  });

  return (
    <>
      {meshes.map((m, i) => (
        <mesh
          key={i}
          ref={el => { if (el) meshRefs.current[i] = el; }}
          position={m.position}
        >
          <planeGeometry args={[2 / gridSize, 2 / gridSize]} />
          <meshStandardMaterial
            map={texture}
            transparent
            opacity={1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </>
  );
}

export function MagicCubeScene({ imageUrl, nextImageUrl, direction, isTransitioning, onTransitionEnd }: {
  imageUrl: string; nextImageUrl: string | null;
  direction: 'next' | 'prev'; isTransitioning: boolean;
  onTransitionEnd?: () => void;
}) {
  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => onTransitionEnd?.(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning, onTransitionEnd]);

  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 50 }} style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />
      <CubeGrid imageUrl={imageUrl} nextImageUrl={nextImageUrl} direction={direction} isTransitioning={isTransitioning} />
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  );
}

/* ================================================================
 * 3. 液态玻璃 — ShaderMaterial 水波折射
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
  varying vec2 vUv;

  // Simplex 2D noise
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 uv = vUv;

    // Simplex 噪声扭曲位移场（强度 0.05）
    float noise = snoise(uv * 3.0 + uTime * 0.3) * 0.05;
    vec2 distortedUv = uv + vec2(noise, noise * 0.7);

    vec4 tex1 = texture2D(uTexture1, distortedUv);
    vec4 tex2 = texture2D(uTexture2, distortedUv);

    // 混合
    vec4 color = mix(tex1, tex2, uProgress);

    // 中间帧 (0.4~0.6) 镜面高光条纹从左向右扫过
    float highlight = 0.0;
    if (uProgress > 0.4 && uProgress < 0.6) {
      float sweepPos = (uProgress - 0.4) / 0.2; // 0~1
      float dist = abs(uv.x - sweepPos);
      highlight = smoothstep(0.15, 0.0, dist) * 0.6;
    }
    color.rgb += vec3(highlight);

    // 菲涅尔发光（边缘）
    float edge = pow(1.0 - abs(dot(normalize(uv - 0.5), vec2(1.0, 0.0))), 3.0);
    color.rgb += vec3(0.1, 0.2, 0.4) * edge * 0.3;

    gl_FragColor = color;
  }
`;

function LiquidGlassPlane({ imageUrl, nextImageUrl, isTransitioning, onTransitionEnd }: {
  imageUrl: string; nextImageUrl: string | null;
  isTransitioning: boolean; onTransitionEnd?: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);
  const targetProgress = useRef(0);
  const [isAnimating, setIsAnimating] = useState(false);

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
  }), [tex1, tex2]);

  useEffect(() => {
    if (isTransitioning && nextImageUrl) {
      uniforms.uTexture2.value = tex2 || tex1;
      targetProgress.current = 1;
      progressRef.current = 0;
      setIsAnimating(true);
    }
  }, [isTransitioning, nextImageUrl, tex2, tex1, uniforms]);

  useFrame((_, delta) => {
    uniforms.uTime.value += delta;

    if (isAnimating) {
      progressRef.current += delta * 0.8; // ~1.25s transition
      if (progressRef.current >= 1) {
        progressRef.current = 1;
        setIsAnimating(false);
        // swap textures
        uniforms.uTexture1.value = uniforms.uTexture2.value;
        uniforms.uProgress.value = 0;
        progressRef.current = 0;
        targetProgress.current = 0;
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
 * 4. 无限景深 — Z 轴穿梭 + 粒子星空 + Bloom
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
    if (ref.current) ref.current.rotation.y += delta * 0.02;
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
  const groupRef = useRef<THREE.Group>(null);
  const cameraTargetZ = useRef(0);
  const currentPhotoRef = useRef<THREE.Mesh>(null);
  const nextPhotoRef = useRef<THREE.Mesh>(null);
  const transitionProgress = useRef(0);
  const [animPhase, setAnimPhase] = useState<'idle' | 'zoom-in' | 'zoom-out'>('idle');

  // 生成照片位置
  const photoPositions = useMemo(() => {
    return images.map((_, i) => ({
      x: (Math.random() - 0.5) * 4,
      y: (Math.random() - 0.5) * 3,
      z: -5 - i * 2.5 - Math.random() * 2,
    }));
  }, [images]);

  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return images.map(url => {
      const t = loader.load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    });
  }, [images]);

  useEffect(() => {
    if (isTransitioning) {
      setAnimPhase('zoom-in');
      transitionProgress.current = 0;
    }
  }, [isTransitioning]);

  useFrame(({ camera }, delta) => {
    if (animPhase === 'zoom-in') {
      transitionProgress.current += delta * 1.2;

      // 当前照片缩小后退
      if (currentPhotoRef.current) {
        const t = Math.min(1, transitionProgress.current);
        const scale = 1 - t * 0.8; // 1 → 0.2
        currentPhotoRef.current.scale.set(scale, scale, 1);
        currentPhotoRef.current.position.z -= delta * 5;
        (currentPhotoRef.current.material as THREE.MeshStandardMaterial).opacity = 1 - t * 0.5;
      }

      // 新照片从 Z=+8 穿镜铺满
      if (nextPhotoRef.current && nextIndex !== null) {
        const t = Math.min(1, transitionProgress.current);
        const eased = 1 - Math.pow(1 - t, 3);
        const scale = 2 - eased; // 2 → 1
        nextPhotoRef.current.scale.set(scale, scale, 1);
        nextPhotoRef.current.position.z = 8 - eased * 8; // 8 → 0
        nextPhotoRef.current.position.x = 0;
        nextPhotoRef.current.position.y = 0;
        (nextPhotoRef.current.material as THREE.MeshStandardMaterial).opacity = eased;
      }

      if (transitionProgress.current >= 1) {
        setAnimPhase('idle');
        transitionProgress.current = 0;
        onTransitionEnd?.();
      }
    }

    // 相机轻微浮动
    camera.position.x = Math.sin(Date.now() * 0.0003) * 0.1;
    camera.position.y = Math.cos(Date.now() * 0.0004) * 0.05;
  });

  return (
    <group ref={groupRef}>
      {/* 背景照片（非当前/下一张的远景） */}
      {images.map((url, i) => {
        if (i === currentIndex || i === nextIndex) return null;
        const pos = photoPositions[i];
        return (
          <mesh key={i} position={[pos.x, pos.y, pos.z]}>
            <planeGeometry args={[1.6, 1.2]} />
            <meshStandardMaterial map={textures[i]} transparent opacity={0.15} side={THREE.DoubleSide} />
          </mesh>
        );
      })}

      {/* 当前照片 */}
      <mesh
        ref={currentPhotoRef}
        position={[0, 0, 0]}
      >
        <planeGeometry args={[3.2, 2]} />
        <meshStandardMaterial map={textures[currentIndex]} transparent opacity={1} side={THREE.DoubleSide} />
      </mesh>

      {/* 下一张照片（仅在切换时显示） */}
      {nextIndex !== null && animPhase === 'zoom-in' && (
        <mesh ref={nextPhotoRef} position={[0, 0, 8]}>
          <planeGeometry args={[3.2, 2]} />
          <meshStandardMaterial map={textures[nextIndex]} transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>
      )}
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
