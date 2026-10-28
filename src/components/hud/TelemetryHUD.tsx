'use client';

import { useEffect, useRef } from 'react';
import { STAGES, useSpatialStore } from '@/store/useSpatialStore';
import { Volume2, VolumeX, Compass, Cpu } from 'lucide-react';
import { soundEngine } from '@/utils/soundEngine';
import type Lenis from 'lenis';

/* ───────────────────────── Tunables ───────────────────────── */
const HOT_SELECTOR = 'a,button,[role="button"],[data-hot]';
const TEXT_SELECTOR = 'input,textarea,select';
const SPRING_K = 300;   // cursor ring spring stiffness
const SPRING_C = 28;    // damping (slightly underdamped -> tiny overshoot)
const MAGNET_PULL = 0.28; // how far the ring is pulled toward a hovered button's center

/* ───────────────────────── Helpers ───────────────────────── */
// Fixed-width signed number: the ticker never changes width (no layout shift)
const fmt = (n: number) => `${n < 0 ? '-' : '+'}${Math.abs(n).toFixed(2).padStart(5, '0')}`;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export default function TelemetryHUD() {
  const activeStage = useSpatialStore((s) => s.activeStage);
  const isAudioMuted = useSpatialStore((s) => s.isAudioMuted);
  const toggleAudio = useSpatialStore((s) => s.toggleAudio);

  // Direct DOM refs: high-frequency telemetry without React re-renders
  const coordRef = useRef<HTMLSpanElement>(null);
  const velRef = useRef<HTMLSpanElement>(null);
  const fovRef = useRef<HTMLSpanElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ring = cursorRingRef.current;
    const dot = cursorDotRef.current;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // ── Cursor state (plain variables: nothing here touches React) ──
    let px = 0, py = 0;               // raw pointer
    let tx = 0, ty = 0;               // ring target (pointer + magnetic pull)
    let x = 0, y = 0, vx = 0, vy = 0; // ring spring state
    let scale = 1;
    let seen = false;
    let outside = false;
    let textMode = false;
    let hotDom = false;
    let pressed = false;
    let lastHide = '';
    let lastHot = '';

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      px = e.clientX;
      py = e.clientY;
      outside = false;

      const t = e.target instanceof Element ? e.target : null;
      textMode = !!t?.closest(TEXT_SELECTOR);
      const el = t?.closest(HOT_SELECTOR) ?? null;
      hotDom = !!el;

      tx = px;
      ty = py;
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width < 320 && r.height < 120) {
          // Magnetic: ring leans toward the center of small buttons/links
          tx = px + (r.left + r.width / 2 - px) * MAGNET_PULL;
          ty = py + (r.top + r.height / 2 - py) * MAGNET_PULL;
        }
      }

      if (!seen) {
        seen = true;
        x = tx;
        y = ty;
        vx = 0;
        vy = 0;
      }
    };
    const onDown = () => { pressed = true; };
    const onUp = () => { pressed = false; };
    const onLeave = () => { outside = true; };
    const onEnter = () => { outside = false; };

    if (finePointer) {
      document.documentElement.classList.add('has-custom-cursor');
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerdown', onDown, { passive: true });
      window.addEventListener('pointerup', onUp, { passive: true });
      window.addEventListener('blur', onUp);
      document.documentElement.addEventListener('mouseleave', onLeave);
      document.documentElement.addEventListener('mouseenter', onEnter);
    }

    // ── Telemetry + cursor loop ──
    let rafId = 0;
    let last = performance.now();
    let acc = 1; // write the ticker on the first frame
    let lastCoord = '';
    let lastVel = '';
    let lastFov = '';
    let lastFill = -1;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const s = useSpatialStore.getState();

      // Web Audio sub-bass filter follows scroll velocity
      soundEngine.updateVelocity(s.scrollVelocity);
      soundEngine.setStage(s.activeStage);

      // Ticker text: ~20Hz, only when the string actually changed
      acc += dt;
      if (acc >= 0.05) {
        acc = 0;
        const { x: cx, y: cy, z: cz, fov } = s.cameraCoords;
        const coord = `X:${fmt(cx)}  Y:${fmt(cy)}  Z:${fmt(cz)}`;
        if (coord !== lastCoord && coordRef.current) {
          coordRef.current.textContent = coord;
          lastCoord = coord;
        }
        const vel = `${Math.abs(s.scrollVelocity).toFixed(3)} m/s`;
        if (vel !== lastVel && velRef.current) {
          velRef.current.textContent = vel;
          lastVel = vel;
        }
        const fovText = `${fov.toFixed(1)}°`;
        if (fovText !== lastFov && fovRef.current) {
          fovRef.current.textContent = fovText;
          lastFov = fovText;
        }
      }

      // Scrubber fill (compositor-only transform)
      const p = Math.min(1, Math.max(0, s.scrollProgress));
      if (p !== lastFill && progressFillRef.current) {
        progressFillRef.current.style.transform = `scaleY(${p})`;
        lastFill = p;
      }

      // Cursor
      if (finePointer && ring && dot) {
        // Monoliths in 3D set body cursor to 'pointer' while hovered
        const hot = hotDom || document.body.style.cursor === 'pointer';
        const hide = !seen || outside || textMode;

        const hideStr = hide ? 'true' : 'false';
        if (hideStr !== lastHide) {
          ring.dataset.hide = hideStr;
          dot.dataset.hide = hideStr;
          lastHide = hideStr;
        }
        const hotStr = hot ? 'true' : 'false';
        if (hotStr !== lastHot) {
          ring.dataset.hot = hotStr;
          lastHot = hotStr;
        }

        // Underdamped spring (Hooke's law), substepped for stability
        const sdt = Math.min(dt, 1 / 30);
        vx += ((tx - x) * SPRING_K - vx * SPRING_C) * sdt;
        vy += ((ty - y) * SPRING_K - vy * SPRING_C) * sdt;
        x += vx * sdt;
        y += vy * sdt;

        const targetScale = pressed ? 0.8 : hot ? 1.7 : 1;
        scale += (targetScale - scale) * (1 - Math.exp(-14 * dt));

        ring.style.transform = `translate3d(${x - 16}px, ${y - 16}px, 0) scale(${scale})`;
        dot.style.transform = `translate3d(${px - 3}px, ${py - 3}px, 0)`;
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('blur', onUp);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      document.documentElement.removeEventListener('mouseenter', onEnter);
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, []);

  const handleAudioToggle = () => {
    const nextMutedState = !isAudioMuted;
    toggleAudio();
    soundEngine.toggle(!nextMutedState);
  };

  const jumpToStage = (targetProgress: number, idx: number) => {
    soundEngine.triggerPing(440 + idx * 88);
    const lenis = (window as unknown as { lenis?: Lenis }).lenis;
    if (!lenis) return;

    const limit = lenis.limit > 0 ? lenis.limit : document.documentElement.scrollHeight - window.innerHeight;
    if (limit <= 0) return;

    const destination = targetProgress * limit;
    const distance = Math.abs(destination - lenis.scroll) / limit; // 0..1
    lenis.scrollTo(destination, {
      duration: Math.min(3.2, Math.max(1.1, 0.9 + distance * 3.2)), // farther jumps take longer
      easing: easeInOutCubic,
    });
  };

  return (
    <>
      {/* Spring-physics magnetic cursor (enabled for fine pointers only; native cursor is hidden via CSS then) */}
      <div
        ref={cursorRingRef}
        data-hide="true"
        data-hot="false"
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[60] h-8 w-8 rounded-full border border-[#F2EFE9]/35 will-change-transform transition-[opacity,border-color,background-color] duration-200 data-[hide=true]:opacity-0 data-[hot=true]:border-[#FF5500] data-[hot=true]:bg-[#FF5500]/10"
      />
      <div
        ref={cursorDotRef}
        data-hide="true"
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[60] h-1.5 w-1.5 rounded-full bg-[#FF5500] will-change-transform transition-opacity duration-200 data-[hide=true]:opacity-0"
      />

      {/* Structural 1px architectural hairline frame */}
      <div className="fixed inset-4 md:inset-6 border border-white/[0.07] pointer-events-none z-30 flex flex-col justify-between">
        {/* TOP BAR */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] bg-[#050507]/60 backdrop-blur-[6px] pointer-events-auto">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
            <span className="font-mono text-xs tracking-[0.25em] text-[#F2EFE9] uppercase">
              ATUL PARMAR // TESSERACT.OS
            </span>
          </div>

          {/* 5-stage spatial coordinate navigation */}
          <nav aria-label="Stage navigation" className="hidden lg:flex items-center gap-6">
            {STAGES.map((stage, idx) => {
              const isActive = activeStage === idx;
              return (
                <button
                  key={stage.id}
                  type="button"
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => jumpToStage(stage.targetProgress, idx)}
                  className={`group flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] transition-colors cursor-pointer ${
                    isActive ? 'text-[#FF5500]' : 'text-[#7E828E] hover:text-[#F2EFE9]'
                  }`}
                >
                  <span className="opacity-60">[{stage.index}]</span>
                  <span>{stage.name}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500]" />}
                </button>
              );
            })}
          </nav>

          {/* Audio toggle */}
          <button
            type="button"
            aria-pressed={!isAudioMuted}
            onClick={handleAudioToggle}
            className="flex items-center gap-2 px-3 py-1.5 border border-white/10 bg-white/[0.02] hover:border-[#FF5500]/50 transition-colors font-mono text-[10px] tracking-[0.2em] text-[#F2EFE9] cursor-pointer"
          >
            {isAudioMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-[#7E828E]" />
                <span>AUDIO // OFF</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#FF5500]" />
                <span>HZ DRONE // ON</span>
              </>
            )}
          </button>
        </header>

        {/* RIGHT-EDGE SPATIAL TIME SCRUBBER: track, live fill, clickable stage ticks */}
        <div className="pointer-events-none absolute right-3 top-1/2 hidden h-64 w-4 -translate-y-1/2 md:block">
          <div className="absolute right-[7px] top-0 h-full w-px bg-white/10" />
          <div
            ref={progressFillRef}
            className="absolute right-[7px] top-0 h-full w-px origin-top bg-[#FF5500] will-change-transform"
            style={{ transform: 'scaleY(0)' }}
          />
          {STAGES.map((stage, idx) => {
            const isActive = activeStage === idx;
            return (
              <button
                key={stage.id}
                type="button"
                aria-label={`Go to ${stage.name}`}
                onClick={() => jumpToStage(stage.targetProgress, idx)}
                className="group pointer-events-auto absolute right-0 flex h-5 w-4 -translate-y-1/2 cursor-pointer items-center justify-end"
                style={{ top: `${stage.targetProgress * 100}%` }}
              >
                <span className="absolute right-6 whitespace-nowrap font-mono text-[9px] tracking-[0.2em] text-[#7E828E] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  [{stage.index}] {stage.name}
                </span>
                <span
                  className={`block h-px transition-all duration-300 ${
                    isActive ? 'w-4 bg-[#FF5500]' : 'w-2 bg-white/30 group-hover:w-3 group-hover:bg-[#F2EFE9]'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* BOTTOM TELEMETRY READOUT BAR */}
        <footer className="flex flex-wrap items-center justify-between px-5 py-3 border-t border-white/[0.07] bg-[#050507]/60 backdrop-blur-[6px] font-mono text-[10px] tracking-[0.18em] text-[#7E828E]">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-[#A6E1FA]" />
              <span ref={coordRef} className="whitespace-pre text-[#F2EFE9]">
                X:+00.00  Y:+00.00  Z:+14.50
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span>THRUST:</span>
              <span ref={velRef} className="inline-block min-w-[9ch] text-[#FF5500]">0.000 m/s</span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span>OPTICS FOV:</span>
              <span ref={fovRef} className="inline-block min-w-[6ch] text-[#A6E1FA]">45.0°</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Cpu className="w-3.5 h-3.5 text-[#FF5500]" />
            <span className="text-[#F2EFE9]">
              SECTOR {STAGES[activeStage]?.index} // {STAGES[activeStage]?.subtitle}
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}