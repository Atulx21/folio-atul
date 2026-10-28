'use client';

import { useEffect, useRef, useState } from 'react';
import { useSpatialStore } from '@/store/useSpatialStore';
import type Lenis from 'lenis';

/* ───────────────────────── Tunables ───────────────────────── */
const MIN_MS = 1400;  // always show the sequence at least this long (no flash on fast machines)
const MAX_MS = 8000;  // safety net: open the site even if the scene never reports ready
const OPEN_MS = 1000; // shutter animation length (+ unmount delay)

const STATUS = [
  [0, 'COMPILING GLSL SHADERS & CATMULL-ROM SPLINES'],
  [28, 'ALLOCATING GPU BUFFERS'],
  [58, 'BUILDING SPATIAL TOPOLOGY'],
  [86, 'STABILIZING SINGULARITY'],
] as const;

const statusFor = (v: number) => {
  let label: string = STATUS[0][1];
  for (const [at, text] of STATUS) if (v >= at) label = text;
  return label;
};

export default function PreloaderOverlay() {
  const [isOpening, setIsOpening] = useState(false);
  const [isUnmounted, setIsUnmounted] = useState(false);

  const percentRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const sceneReadyRef = useRef(false);

  // Real readiness signal: CameraRig flips this after the first rendered frames
  useEffect(() => {
    sceneReadyRef.current = useSpatialStore.getState().sceneReady;
    return useSpatialStore.subscribe((s) => {
      sceneReadyRef.current = s.sceneReady;
    });
  }, []);

  useEffect(() => {
    const getLenis = () => (window as unknown as { lenis?: Lenis }).lenis;

    const start = performance.now();
    let last = start;
    let shown = 0;
    let raf = 0;
    let finishing = false;
    let lenisStopped = false;
    let lastInt = -1;
    let lastLabel = '';
    let openTimer: ReturnType<typeof setTimeout> | undefined;
    let unmountTimer: ReturnType<typeof setTimeout> | undefined;

    const paint = (v: number) => {
      const n = Math.min(100, Math.round(v));
      if (n !== lastInt) {
        lastInt = n;
        if (percentRef.current) percentRef.current.textContent = String(n).padStart(3, '0');
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${Math.min(1, v / 100)})`;
      const label = statusFor(v);
      if (label !== lastLabel && statusRef.current) {
        lastLabel = label;
        statusRef.current.textContent = label;
      }
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const elapsed = now - start;

      // Hold scrolling until we open (Lenis is created by SmoothScroll after this mounts, so retry)
      if (!lenisStopped) {
        const l = getLenis();
        if (l) {
          l.stop();
          lenisStopped = true;
        }
      }

      const ready = sceneReadyRef.current || elapsed > MAX_MS;
      const natural = 100 * (1 - Math.exp(-elapsed / 1100)); // ~65% @1.1s, ~86% @2.2s
      const target = ready && elapsed >= MIN_MS ? 100 : Math.min(92, natural);

      shown += (target - shown) * (1 - Math.exp(-7 * dt));
      paint(shown);

      if (target === 100 && shown > 99.4 && !finishing) {
        finishing = true;
        paint(100);
        openTimer = setTimeout(() => {
          setIsOpening(true);
          getLenis()?.start();
          unmountTimer = setTimeout(() => setIsUnmounted(true), OPEN_MS);
        }, 260);
        return; // stop the loop
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      if (openTimer) clearTimeout(openTimer);
      if (unmountTimer) clearTimeout(unmountTimer);
      if (lenisStopped) getLenis()?.start();
    };
  }, []);

  if (isUnmounted) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading portfolio"
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden ${
        isOpening ? 'pointer-events-none' : 'pointer-events-auto'
      }`}
    >
      {/* Top airlock shutter */}
      <div
        className={`flex h-1/2 w-full items-end justify-between border-b border-white/10 bg-[#050507] px-8 pb-6 transition-transform duration-[900ms] ease-[cubic-bezier(0.76,0,0.24,1)] will-change-transform motion-reduce:transition-none md:px-16 ${
          isOpening ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        <div className="space-y-1">
          <span className="block font-mono text-[10px] tracking-[0.3em] text-[#FF5500]">
            INITIALIZING NON-LINEAR SPATIAL ENGINE //
          </span>
          <span ref={statusRef} className="font-mono text-xs tracking-[0.2em] text-[#7E828E]">
            COMPILING GLSL SHADERS & CATMULL-ROM SPLINES
          </span>
        </div>

        <div className="font-mono text-5xl font-extrabold tracking-tighter text-[#F2EFE9] md:text-7xl">
          <span ref={percentRef}>000</span>
          <span className="ml-1 text-2xl text-[#FF5500]">%</span>
        </div>
      </div>

      {/* Central horizon laser (transform, not width: no layout work per frame) */}
      <div
        ref={barRef}
        className={`absolute left-0 top-1/2 h-[2px] w-full origin-left bg-gradient-to-r from-transparent via-[#FF5500] to-[#A6E1FA] transition-opacity duration-300 will-change-transform ${
          isOpening ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ transform: 'scaleX(0)' }}
      />

      {/* Bottom airlock shutter */}
      <div
        className={`flex h-1/2 w-full items-start justify-between border-t border-white/10 bg-[#050507] px-8 pt-6 transition-transform duration-[900ms] ease-[cubic-bezier(0.76,0,0.24,1)] will-change-transform motion-reduce:transition-none md:px-16 ${
          isOpening ? 'translate-y-full' : 'translate-y-0'
        }`}
      >
        <div className="font-mono text-[10px] tracking-[0.25em] text-[#7E828E]">
          ATUL PARMAR // FULL-STACK SOFTWARE ENGINEER
        </div>
        <div className="font-mono text-[10px] tracking-[0.25em] text-[#A6E1FA]">
          [WEBGL2 // 70,000 STARS // 60-120 HZ]
        </div>
      </div>
    </div>
  );
}