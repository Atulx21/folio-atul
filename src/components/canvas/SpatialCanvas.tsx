'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Sparkles, PerformanceMonitor, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import type { VignetteEffect } from 'postprocessing';
import * as THREE from 'three';
import CameraRig from './CameraRig';
import { useSpatialStore } from '@/store/useSpatialStore';
import GalaxyBackdrop from './GalaxyBackdrop';

/* Post-processing lives in its own component so it can animate the vignette per frame. */
function PostFX() {
  const vignette = useRef<VignetteEffect>(null);

  useFrame(() => {
    const v = vignette.current;
    if (!v) return;
    // The vignette fades away while the alabaster iris opens (camera progress 0.84 -> 0.98)
    const t = useSpatialStore.getState().cameraProgress;
    const open = THREE.MathUtils.smoothstep(t, 0.84, 0.98);
    v.darkness = THREE.MathUtils.lerp(0.85, 0.3, open);
  });

  return (
    <EffectComposer enableNormalPass={false} multisampling={0}>
      <Bloom luminanceThreshold={0.75} mipmapBlur intensity={1.1} radius={0.6} />
      <Noise opacity={0.035} />
      <Vignette ref={vignette} eskil={false} offset={0.15} darkness={0.85} />
    </EffectComposer>
  );
}

export default function SpatialCanvas() {
  const [eventSource, setEventSource] = useState<HTMLElement | null>(null);
  const [dpr, setDpr] = useState(1.25);

  useEffect(() => {
    setEventSource(document.body);
  }, []);

  return (
    <div className="fixed inset-0 z-0 bg-[#050507]">
      <Canvas
        eventSource={eventSource ?? undefined}
        eventPrefix="client"
        dpr={dpr}
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        camera={{ position: [0, 0, 14.5], fov: 45, near: 0.1, far: 200 }}
      >
        {/* Scales resolution between 1x and 1.5x based on measured FPS */}
        <PerformanceMonitor
          flipflops={3}
          onChange={({ factor }) => setDpr(Math.round((1 + 0.5 * factor) * 10) / 10)}
          onFallback={() => setDpr(1)}
        />

        <color attach="background" args={['#050507']} />
        <fogExp2 attach="fog" args={['#050507', 0.022]} />

        {/* Architectural Lighting */}
        <ambientLight intensity={0.25} />
        <directionalLight position={[15, 20, 10]} intensity={2.5} color="#F2EFE9" />
        <pointLight position={[-10, -10, -5]} intensity={4} color="#FF5500" distance={40} />
        <pointLight position={[10, 5, -25]} intensity={4} color="#A6E1FA" distance={45} />

        <Suspense fallback={null}>
          {/* Procedural studio environment: gives metals something to reflect (rendered once, no downloads) */}
          <Environment resolution={256} frames={1} environmentIntensity={0.6}>
            <Lightformer form="rect" intensity={2.2} color="#F2EFE9" position={[0, 6, 4]} scale={[14, 2, 1]} />
            <Lightformer form="rect" intensity={1.6} color="#FF5500" position={[-8, 0, -4]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} />
            <Lightformer form="rect" intensity={1.6} color="#A6E1FA" position={[8, 2, -6]} rotation-y={-Math.PI / 2} scale={[10, 3, 1]} />
          </Environment>

                   <CameraRig />
          <GalaxyBackdrop />
          <Stars radius={80} depth={60} count={1800} factor={3} saturation={0} fade speed={0.6} />
          <Sparkles count={400} scale={[30, 30, 80]} position={[0, 0, -25]} size={1.4} speed={0.2} color="#FF5500" opacity={0.35} />

          <PostFX />
        </Suspense>
      </Canvas>
    </div>
  );
}