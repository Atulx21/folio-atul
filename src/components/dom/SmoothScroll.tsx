'use client';

import { ReactNode, useEffect } from 'react';
import Lenis from 'lenis';
import { addEffect } from '@react-three/fiber';
import { useSpatialStore } from '@/store/useSpatialStore';

export default function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: false, // we drive Lenis from R3F's frame loop (single clock)
      lerp: 0.09,
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });

    // Expose lenis globally so HUD navigation buttons can scrub through 3D space
    const w = window as unknown as { lenis?: Lenis };
    w.lenis = lenis;

    lenis.on('scroll', (e: Lenis) => {
      const state = useSpatialStore.getState();
      const p = Number.isFinite(e.progress) ? e.progress : 0;
      state.scrollProgress = p;
      state.scrollVelocity = e.velocity;

      // Stages sit at 0, .25, .5, .75, 1 -> nearest stage, matches camera waypoints
      const currentStage = Math.min(4, Math.max(0, Math.round(p * 4)));
      if (state.activeStage !== currentStage) {
        state.setActiveStage(currentStage);
      }
    });

    // Track normalized mouse coordinates (-1 to +1) for 3D raycasting & parallax
    const handleMouseMove = (e: MouseEvent) => {
      const state = useSpatialStore.getState();
      state.mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      state.mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Lenis advances inside R3F's frame, right before render
    let last = 0;
    const removeEffect = addEffect((time: number) => {
      lenis.raf(time);

      // Frame-rate independent velocity decay (equals *0.92 per frame at 60fps)
      const dt = last ? Math.min((time - last) / 1000, 0.1) : 0;
      last = time;
      useSpatialStore.getState().scrollVelocity *= Math.exp(-5 * dt);
    });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      removeEffect();
      lenis.destroy();
      w.lenis = undefined;
    };
  }, []);

  return <>{children}</>;
}