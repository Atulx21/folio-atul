'use client';

import { ReactNode, useEffect } from 'react';
import Lenis from 'lenis';
import { addEffect } from '@react-three/fiber';
import { useSpatialStore } from '@/store/useSpatialStore';

/* Stage snapping: after the user stops scrolling, glide to the nearest designed camera pose. */
const SNAP_ENABLED = true;
const SNAP_IDLE_MS = 140;     // wait this long after scrolling stops
const SNAP_MIN_MOVE = 0.06;   // fraction of one stage gap that counts as "intent to move"
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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

    // ── Snap state ──
    let last = 0;
    let lastMove = 0;
    let needsEval = true;
    let settledStage = 0;

    const evaluateSnap = () => {
      const limit = lenis.limit;
      if (!(limit > 0)) return;
      const seg = limit / 4;
      const pos = lenis.scroll / seg;
      const delta = lenis.scroll - settledStage * seg;

      let target = settledStage;
      if (Math.abs(delta) >= SNAP_MIN_MOVE * seg) {
        // Any real movement advances at least one stage in that direction (momentum can carry further)
        target =
          delta > 0
            ? Math.max(settledStage + 1, Math.round(pos))
            : Math.min(settledStage - 1, Math.round(pos));
      }
      target = Math.max(0, Math.min(4, target));
      settledStage = target;

      const y = target * seg;
      if (Math.abs(lenis.scroll - y) > 3) {
        lenis.scrollTo(y, { duration: 1.0, easing: easeInOutCubic });
      }
    };

    // Lenis advances inside R3F's frame, right before render
    const removeEffect = addEffect((time: number) => {
      lenis.raf(time);

      // Frame-rate independent velocity decay (equals *0.92 per frame at 60fps)
      const dt = last ? Math.min((time - last) / 1000, 0.1) : 0;
      last = time;
      useSpatialStore.getState().scrollVelocity *= Math.exp(-5 * dt);

      if (SNAP_ENABLED) {
        if (lenis.isScrolling || lenis.isStopped) {
          lastMove = time;
          needsEval = true;
        } else if (needsEval && time - lastMove > SNAP_IDLE_MS) {
          needsEval = false;
          evaluateSnap();
        }
      }
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