'use client';

import AvailabilityBadge from '@/components/dom/AvailabilityBadge';
import { ComponentType, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  Briefcase,
  GraduationCap,
  Layers,
  Award,
  FileText,
  Mail,
  Terminal,
  Code2,
  Globe,
  ExternalLink,
  Play,
  ArrowUpRight,
} from 'lucide-react';
import {
  PROFILE,
  SKILL_GROUPS,
  EXPERIENCE,
  EDUCATION,
  ACHIEVEMENTS,
  AVAILABILITY,
} from '@/data/profileData';
import { PROJECTS_ARCHIVE } from '@/data/projectsData';
import { useSpatialStore } from '@/store/useSpatialStore';
import { soundEngine } from '@/utils/soundEngine';
import type Lenis from 'lenis';

const EXIT_MS = 200;

const SECTIONS = [
  { id: 'summary', label: 'SUMMARY' },
  { id: 'stack', label: 'TECH STACK' },
  { id: 'experience', label: 'EXPERIENCE' },
  { id: 'projects', label: 'PROJECTS' },
  { id: 'education', label: 'EDUCATION' },
] as const;

const LINK_ICON: Record<string, ComponentType<{ className?: string }>> = {
  resume: FileText,
  github: Terminal,
  linkedin: Globe,
  leetcode: Code2,
  email: Mail,
};

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] tracking-wider text-[#A6E1FA]">
      {children}
    </span>
  );
}

function SectionHeading({
  id,
  icon: Icon,
  title,
}: {
  id: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <h3
      id={`profile-${id}`}
      className="flex scroll-mt-4 items-center gap-2.5 border-b border-white/10 pb-3 font-mono text-[11px] uppercase tracking-[0.28em] text-[#F2EFE9]"
    >
      <Icon className="h-4 w-4 text-[#FF5500]" />
      <span>{title}</span>
    </h3>
  );
}

/* Always in the DOM (visually hidden): search engines, ATS parsers and screen readers get the full text. */
function ProfileSeo() {
  return (
    <div className="sr-only">
      <h2>
        {PROFILE.name} — {PROFILE.title}
      </h2>
      <p>{AVAILABILITY.status}: {AVAILABILITY.detail}</p>
      <p>{PROFILE.summary.join(' ')}</p>
      <h3>Tech stack</h3>
      {SKILL_GROUPS.map((g) => (
        <p key={g.title}>
          {g.title}: {g.items.join(', ')}
        </p>
      ))}
      <h3>Experience</h3>
      {EXPERIENCE.map((e) => (
        <p key={e.id}>
          {e.role}, {e.company} ({e.period}). {e.bullets.join(' ')}
        </p>
      ))}
      <h3>Education</h3>
      {EDUCATION.map((e) => (
        <p key={e.id}>
          {e.degree}, {e.school} ({e.period}). {e.detail}
        </p>
      ))}
      <h3>Projects</h3>
      {PROJECTS_ARCHIVE.map((p) => (
        <p key={p.id}>
          {p.title}: {p.summary}
        </p>
      ))}
    </div>
  );
}

function ProfileShell() {
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    soundEngine.triggerPing(320);
    window.setTimeout(() => useSpatialStore.getState().setProfileOpen(false), EXIT_MS);
  }, []);

  // Pause page scrolling (and the camera) while the panel is open
  useEffect(() => {
    const lenis = (window as unknown as { lenis?: Lenis }).lenis;
    lenis?.stop();
    return () => lenis?.start();
  }, []);

  // Focus in on open, restore on close
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus({ preventScroll: true });
    return () => previous?.focus?.({ preventScroll: true });
  }, []);

  // Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const jump = (id: string) => {
    soundEngine.triggerPing(520);
    document.getElementById(`profile-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openProject = (id: string) => {
    const s = useSpatialStore.getState();
    s.setProfileOpen(false);
    s.setSelectedProject(id);
  };

  return (
    <div
      data-ui
      data-closing={closing}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="modal-backdrop fixed inset-0 z-[45] flex items-stretch justify-center bg-[#050507]/90 md:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Full profile"
        data-closing={closing}
        className="modal-panel relative flex w-full max-w-5xl flex-col overflow-hidden border border-white/15 bg-[#0B0C10]/[0.98] text-[#F2EFE9] shadow-2xl"
      >
        <div className="h-px w-full shrink-0 bg-gradient-to-r from-[#FF5500] to-transparent" />

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-3 md:px-8">
          <span className="truncate font-mono text-xs tracking-[0.25em] text-[#A6E1FA]">
            PROFILE // {PROFILE.name.toUpperCase()}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={PROFILE.links[0].href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#FF5500] px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#050507] transition-colors hover:bg-[#F2EFE9]"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>RESUME</span>
            </a>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={close}
              className="flex cursor-pointer items-center gap-1.5 border border-white/15 px-3 py-1.5 font-mono text-[11px] tracking-[0.2em] text-[#7E828E] transition-colors hover:border-[#FF5500] hover:text-[#F2EFE9]"
            >
              <X className="h-3.5 w-3.5" />
              <span>CLOSE</span>
              <span className="hidden text-[9px] opacity-60 sm:inline">ESC</span>
            </button>
          </div>
        </div>

        {/* Section nav */}
        <nav
          aria-label="Profile sections"
          className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 px-5 py-2.5 md:px-8"
        >
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => jump(s.id)}
              className="shrink-0 cursor-pointer border border-white/10 px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-[#7E828E] transition-colors hover:border-[#FF5500] hover:text-[#F2EFE9]"
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* Scrolling body */}
        <div
          data-lenis-prevent
          className="min-h-0 flex-1 space-y-12 overflow-y-auto overscroll-contain px-5 py-7 md:px-8 md:py-9"
        >
          {/* SUMMARY */}
          <section aria-labelledby="profile-summary" className="space-y-6">
            <div id="profile-summary" className="scroll-mt-4">
              <h2 className="text-4xl font-extrabold tracking-tight md:text-6xl">{PROFILE.name}</h2>
              <p className="mt-1 font-mono text-xs uppercase tracking-[0.3em] text-[#FF5500]">
                {PROFILE.title}
              </p>
              
              {/* ─── ADDED: Availability Badge in Profile Panel ─── */}
              <AvailabilityBadge className="mt-4" />

              <div className="mt-4 max-w-3xl space-y-3 text-sm leading-relaxed text-[#F2EFE9]/85 md:text-base">
                {PROFILE.summary.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {PROFILE.stats.map((s) => (
                <div key={s.label} className="border border-white/10 bg-[#121318]/70 p-4">
                  <div className="text-3xl font-extrabold tracking-tight text-[#F2EFE9]">{s.value}</div>
                  <div className="mt-1 font-mono text-[10px] tracking-[0.22em] text-[#7E828E]">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {PROFILE.links.map((l) => {
                const Icon = LINK_ICON[l.kind] ?? ExternalLink;
                return (
                  <a
                    key={l.kind}
                    href={l.href}
                    target={l.kind === 'email' ? undefined : '_blank'}
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 border border-white/15 px-3.5 py-2 font-mono text-[11px] tracking-[0.2em] text-[#F2EFE9] transition-colors hover:border-[#FF5500]"
                  >
                    <Icon className="h-3.5 w-3.5 text-[#FF5500]" />
                    <span>{l.label}</span>
                  </a>
                );
              })}
            </div>
          </section>

          {/* TECH STACK */}
          <section className="space-y-5">
            <SectionHeading id="stack" icon={Layers} title="Tech stack" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {SKILL_GROUPS.map((group) => (
                <div key={group.title} className="space-y-2.5 border border-white/10 bg-[#121318]/60 p-4">
                  <div className="font-mono text-[10px] tracking-[0.25em] text-[#FF5500]">{group.title}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <Chip key={item}>{item}</Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* EXPERIENCE */}
          <section className="space-y-5">
            <SectionHeading id="experience" icon={Briefcase} title="Experience" />
            <ol className="space-y-6 border-l border-white/10 pl-5">
              {EXPERIENCE.map((job) => (
                <li key={job.id} className="relative space-y-2.5">
                  <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-[#FF5500]" />
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.22em]">
                    <span className="text-[#A6E1FA]">{job.period}</span>
                    <span className="text-[#7E828E]">{job.type}</span>
                  </div>
                  <h4 className="text-xl font-bold tracking-tight">{job.role}</h4>
                  <div className="font-mono text-xs tracking-[0.15em] text-[#FF5500]">{job.company}</div>
                  <ul className="space-y-2 pt-1 text-sm leading-relaxed text-[#F2EFE9]/85">
                    {job.bullets.map((b) => (
                      <li key={b} className="flex gap-2.5">
                        <span className="mt-0.5 text-[#FF5500]">›</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {job.stack.map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* PROJECTS */}
          <section className="space-y-5">
            <SectionHeading id="projects" icon={Terminal} title="Selected projects" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {PROJECTS_ARCHIVE.map((p) => (
                <article
                  key={p.id}
                  className="flex flex-col gap-3 border border-white/10 bg-[#121318]/60 p-4"
                  style={{ borderTopColor: p.accentColor, borderTopWidth: 2 }}
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-lg font-bold tracking-tight">{p.title}</h4>
                      {p.flagship && (
                        <span className="border border-[#FF5500]/60 bg-[#FF5500]/10 px-2 py-0.5 font-mono text-[9px] tracking-[0.25em] text-[#FF5500]">
                          FLAGSHIP
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 font-mono text-[9px] tracking-[0.22em] text-[#7E828E]">{p.category}</div>
                  </div>
                  <p className="text-xs leading-relaxed text-[#F2EFE9]/80">{p.summary}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.techStack.slice(0, 6).map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openProject(p.id)}
                      className="flex cursor-pointer items-center gap-1.5 bg-[#FF5500] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#050507] transition-colors hover:bg-[#F2EFE9]"
                    >
                      <span>CASE STUDY</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                    <a
                      href={p.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 border border-white/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors hover:border-[#FF5500]"
                    >
                      <span>REPO</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {p.demoUrl && (
                      <a
                        href={p.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 border border-white/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors hover:border-[#FF5500]"
                      >
                        <Play className="h-3 w-3 text-[#FF5500]" />
                        <span>DEMO</span>
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* EDUCATION */}
          <section className="space-y-5">
            <SectionHeading id="education" icon={GraduationCap} title="Education" />
            <div className="space-y-3">
              {EDUCATION.map((e) => (
                <div key={e.id} className="border border-white/10 bg-[#121318]/60 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-base font-bold tracking-tight">{e.school}</h4>
                    <span className="font-mono text-[10px] tracking-[0.22em] text-[#A6E1FA]">{e.period}</span>
                  </div>
                  <div className="mt-0.5 text-sm text-[#F2EFE9]/90">{e.degree}</div>
                  <div className="font-mono text-[10px] tracking-[0.18em] text-[#7E828E]">{e.place}</div>
                  <p className="mt-2 text-xs leading-relaxed text-[#F2EFE9]/75">{e.detail}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ACHIEVEMENTS */}
          <section className="space-y-5">
            <SectionHeading id="achievements" icon={Award} title="Achievements" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {ACHIEVEMENTS.map((a) => (
                <div key={a.title} className="border border-white/10 bg-[#121318]/60 p-4">
                  <div className="text-sm font-bold tracking-tight">{a.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-[#7E828E]">{a.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <p className="pb-2 text-center font-mono text-[10px] tracking-[0.25em] text-[#7E828E]">
            PRESS ESC TO RETURN TO THE 3D EXPERIENCE
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePanel() {
  const profileOpen = useSpatialStore((s) => s.profileOpen);
  return (
    <>
      <ProfileSeo />
      {profileOpen && <ProfileShell />}
    </>
  );
}