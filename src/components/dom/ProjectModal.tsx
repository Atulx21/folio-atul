'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PROJECTS_ARCHIVE, ProjectSpec } from '@/data/projectsData';
import { useSpatialStore } from '@/store/useSpatialStore';
import {
  X,
  Layers,
  Server,
  Database,
  ExternalLink,
  Terminal,
  ChevronLeft,
  ChevronRight,
  Play,
} from 'lucide-react';
import { soundEngine } from '@/utils/soundEngine';
import type Lenis from 'lenis';

const FOCUSABLE = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';
const EXIT_MS = 200;

/* Hooks need a stable component, so the early return lives here and the logic below. */
export default function ProjectModal() {
  const selectedProjectId = useSpatialStore((s) => s.selectedProjectId);
  const project = PROJECTS_ARCHIVE.find((p) => p.id === selectedProjectId);
  if (!project) return null;
  return <ModalShell project={project} />;
}

function ModalShell({ project }: { project: ProjectSpec }) {
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const total = PROJECTS_ARCHIVE.length;
  const idx = PROJECTS_ARCHIVE.findIndex((p) => p.id === project.id);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    soundEngine.triggerPing(320);
    window.setTimeout(() => {
      const s = useSpatialStore.getState();
      if (s.selectedProjectId === project.id) s.setSelectedProject(null);
    }, EXIT_MS);
  }, [project.id]);

  const go = useCallback(
    (delta: number) => {
      const next = PROJECTS_ARCHIVE[(idx + delta + total) % total];
      soundEngine.triggerPing(520 + ((idx + delta + total) % total) * 90);
      useSpatialStore.getState().setSelectedProject(next.id);
    },
    [idx, total]
  );

  // 1. Pause page scrolling (and the camera) while the dialog is open
  useEffect(() => {
    const lenis = (window as unknown as { lenis?: Lenis }).lenis;
    lenis?.stop();
    return () => lenis?.start();
  }, []);

  // 2. Move focus into the dialog; give it back on close
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus({ preventScroll: true });
    return () => previous?.focus?.({ preventScroll: true });
  }, []);

  // 3. Keyboard: Esc closes, arrows switch project, Tab stays inside the dialog
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === 'ArrowRight') return go(1);
      if (e.key === 'ArrowLeft') return go(-1);
      if (e.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const nodes = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes.length) return;
      const first = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (!panel.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        lastNode.focus();
      } else if (!e.shiftKey && active === lastNode) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, go]);

  // 4. New project -> scroll back to top
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [project.id]);

  return (
    <div
      data-ui
      data-closing={closing}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="modal-backdrop fixed inset-0 z-40 flex items-end justify-center bg-[#050507]/80 p-0 md:items-center md:justify-end md:p-10"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-modal-title"
        data-closing={closing}
        className="modal-panel relative flex max-h-full w-full max-w-2xl flex-col overflow-hidden border border-white/15 bg-[#0B0C10]/[0.97] text-[#F2EFE9] shadow-2xl md:max-h-[88vh]"
      >
        {/* Accent hairline */}
        <div
          className="h-px w-full shrink-0"
          style={{ background: `linear-gradient(90deg, ${project.accentColor}, transparent 80%)` }}
        />

        {/* Header (stays visible) */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-6 py-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: project.accentColor }}
            />
            <span className="truncate font-mono text-xs tracking-[0.25em] text-[#A6E1FA]">
              [{project.index}] // {project.codeName}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Previous project"
              onClick={() => go(-1)}
              className="cursor-pointer border border-white/15 p-1.5 text-[#7E828E] transition-colors hover:border-[#FF5500] hover:text-[#F2EFE9]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#7E828E]">
              {String(idx + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
            </span>
            <button
              type="button"
              aria-label="Next project"
              onClick={() => go(1)}
              className="cursor-pointer border border-white/15 p-1.5 text-[#7E828E] transition-colors hover:border-[#FF5500] hover:text-[#F2EFE9]"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            <button
              ref={closeBtnRef}
              type="button"
              onClick={close}
              className="ml-2 flex cursor-pointer items-center gap-1.5 border border-white/15 px-3 py-1 font-mono text-[11px] tracking-[0.2em] text-[#7E828E] transition-colors hover:border-[#FF5500] hover:text-[#F2EFE9]"
            >
              <X className="h-3.5 w-3.5" />
              <span>CLOSE</span>
              <span className="hidden text-[9px] opacity-60 sm:inline">ESC</span>
            </button>
          </div>
        </div>

        {/* Scrolling body (data-lenis-prevent: Lenis leaves wheel/touch to the browser here) */}
        <div
          ref={scrollRef}
          data-lenis-prevent
          className="min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-6 py-6 md:px-8 md:py-7"
        >
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#FF5500]">
                {project.category}
              </p>
              {project.flagship && (
                <span className="border border-[#FF5500]/60 bg-[#FF5500]/10 px-2 py-0.5 font-mono text-[9px] tracking-[0.25em] text-[#FF5500]">
                  FLAGSHIP
                </span>
              )}
            </div>
            <h2
              id="project-modal-title"
              className="text-4xl font-extrabold tracking-tight md:text-5xl"
            >
              {project.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#7E828E]">{project.summary}</p>
          </div>

          {/* Capabilities */}
          <div className="space-y-3">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#F2EFE9]">
              CAPABILITIES
            </h3>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs text-[#F2EFE9]/85 sm:grid-cols-2">
              {project.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 leading-relaxed">
                  <span
                    className="mt-[7px] h-1 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: project.accentColor }}
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 3-tier architectural separation */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[#F2EFE9]">
              <Terminal className="h-3.5 w-3.5 text-[#FF5500]" />
              <span>3-TIER SYSTEM TOPOLOGY</span>
            </h3>

            <div className="grid grid-cols-1 gap-2.5 font-mono text-xs">
              <div className="flex items-start gap-3 border border-white/10 bg-[#121318]/80 p-3.5">
                <Layers className="mt-0.5 h-4 w-4 shrink-0 text-[#A6E1FA]" />
                <div>
                  <span className="block text-[10px] tracking-[0.2em] text-[#7E828E]">
                    PRESENTATION LAYER
                  </span>
                  <span className="text-[#F2EFE9]">{project.architectureLayers.presentation}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 border border-white/10 bg-[#121318]/80 p-3.5">
                <Server className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5500]" />
                <div>
                  <span className="block text-[10px] tracking-[0.2em] text-[#7E828E]">
                    SERVICE & ORCHESTRATION LAYER
                  </span>
                  <span className="text-[#F2EFE9]">{project.architectureLayers.service}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 border border-white/10 bg-[#121318]/80 p-3.5">
                <Database className="mt-0.5 h-4 w-4 shrink-0 text-[#A6E1FA]" />
                <div>
                  <span className="block text-[10px] tracking-[0.2em] text-[#7E828E]">
                    DATA & PERSISTENCE LAYER
                  </span>
                  <span className="text-[#F2EFE9]">{project.architectureLayers.data}</span>
                </div>
              </div>
            </div>
          </div>

          {/* First-principles engineering highlights */}
          <div className="space-y-3">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#F2EFE9]">
              FIRST-PRINCIPLES IMPLEMENTATION
            </h3>
            <ul className="space-y-2.5 text-xs text-[#7E828E] md:text-sm">
              {project.engineeringHighlights.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                  <span className="mt-0.5 font-mono text-[#FF5500]">
                    {String(i + 1).padStart(2, '0')}.
                  </span>
                  <span className="text-[#F2EFE9]/90">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Deep dive: schema, API surface, modules */}
          {project.deepDive.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#F2EFE9]">
                SYSTEM DEEP DIVE
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {project.deepDive.map((section) => (
                  <div
                    key={section.title}
                    className="space-y-2 border border-white/10 bg-[#121318]/60 p-3.5"
                  >
                    <div className="font-mono text-[10px] tracking-[0.22em] text-[#A6E1FA]">
                      {section.title}
                    </div>
                    <ul className="space-y-1.5 font-mono text-[11px] leading-relaxed text-[#F2EFE9]/80">
                      {section.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="text-[#FF5500]">›</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer (always visible): tech tags + demo + repository */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-white/10 px-6 py-4 md:px-8">
          <div className="flex flex-wrap gap-1.5">
            {project.techStack.map((tech) => (
              <span
                key={tech}
                className="border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] tracking-wider text-[#A6E1FA]"
              >
                {tech}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 border border-white/20 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#F2EFE9] transition-colors hover:border-[#FF5500]"
              >
                <Play className="h-3.5 w-3.5 text-[#FF5500]" />
                <span>WATCH DEMO</span>
              </a>
            )}
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#FF5500] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#050507] transition-colors hover:bg-[#F2EFE9]"
              >
                <span>INSPECT REPOSITORY</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}