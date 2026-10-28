'use client';

import { useEffect, useState, FormEvent, ReactNode, ComponentType } from 'react';
import dynamic from 'next/dynamic';
import SmoothScroll from '@/components/dom/SmoothScroll';
import TelemetryHUD from '@/components/hud/TelemetryHUD';
import PreloaderOverlay from '@/components/hud/PreloaderOverlay';
import ProjectModal from '@/components/dom/ProjectModal';
import { PROJECTS_ARCHIVE } from '@/data/projectsData';
import { ENGINE_TIERS, CHRONOLOGY_MILESTONES } from '@/data/engineAndChronologyData';
import { useSpatialStore } from '@/store/useSpatialStore';
import { soundEngine } from '@/utils/soundEngine';
import {
  ArrowUpRight,
  Layers,
  Cpu,
  GitBranch,
  Send,
  CheckCircle2,
  Terminal,
  Globe,
  Code2,
  Mail,
  FileText,
  ArrowDown,
} from 'lucide-react';
import Lenis from 'lenis';

// Dynamically import the WebGL Canvas so it strictly executes on the client GPU
const SpatialCanvas = dynamic(() => import('@/components/canvas/SpatialCanvas'), {
  ssr: false,
});

/* ───────────────────────── Contact configuration ─────────────────────────
   1. Set NEXT_PUBLIC_FORM_ENDPOINT in .env.local (e.g. a Formspree URL) so the
      form really sends. Restart `npm run dev` after changing env files.
   2. Fill in LINKEDIN_URL and CONTACT_EMAIL. Empty values are hidden, not shown broken.
   With no endpoint, the form falls back to opening the visitor's mail app (needs CONTACT_EMAIL). */
const FORM_ENDPOINT = process.env.NEXT_PUBLIC_FORM_ENDPOINT ?? '';
const CONTACT_EMAIL = 'atulparmar0021@gmail.com';
const LINKEDIN_URL = 'https://www.linkedin.com/in/atul-parmar/';
const RESUME_URL = 'https://drive.google.com/file/d/1C_2MMx7_-6ZxacXWuX2dqA-kJuSRlTnW/view?usp=drive_link';

type Channel = {
  label: string;
  href: string;
  Icon: ComponentType<{ className?: string }>;
  iconClass: string;
  hoverClass: string;
  external: boolean;
};

const CHANNELS: Channel[] = [
  {
    label: 'GITHUB // @Atulx21',
    href: 'https://github.com/Atulx21',
    Icon: Terminal,
    iconClass: 'text-[#FF5500]',
    hoverClass: 'hover:border-[#FF5500]',
    external: true,
  },
  {
    label: 'LEETCODE // @Atul_Parmar_21',
    href: 'https://leetcode.com/u/Atul_Parmar_21/',
    Icon: Code2,
    iconClass: 'text-[#A6E1FA]',
    hoverClass: 'hover:border-[#A6E1FA]',
    external: true,
  },
    {
    label: 'RESUME // PDF',
    href: RESUME_URL,
    Icon: FileText,
    iconClass: 'text-[#A6E1FA]',
    hoverClass: 'hover:border-[#A6E1FA]',
    external: true,
  },

  
  ...(LINKEDIN_URL
    ? [
        {
          label: 'LINKEDIN // ATUL PARMAR',
          href: LINKEDIN_URL,
          Icon: Globe,
          iconClass: 'text-[#F2EFE9]',
          hoverClass: 'hover:border-[#F2EFE9]',
          external: true,
        },
      ]
    : []),
  ...(CONTACT_EMAIL
    ? [
        {
          label: `EMAIL // ${CONTACT_EMAIL}`,
          href: `mailto:${CONTACT_EMAIL}`,
          Icon: Mail,
          iconClass: 'text-[#FF5500]',
          hoverClass: 'hover:border-[#FF5500]',
          external: false,
        },
      ]
    : []),
];

type ContactPayload = { name: string; email: string; message: string };

async function sendMessage(payload: ContactPayload) {
  if (FORM_ENDPOINT) {
    const res = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Form endpoint responded ${res.status}`);
    return;
  }
  if (CONTACT_EMAIL) {
    const subject = encodeURIComponent(`Portfolio inquiry from ${payload.name}`);
    const body = encodeURIComponent(`${payload.message}\n\n— ${payload.name} (${payload.email})`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    return;
  }
  throw new Error('No contact channel configured (set NEXT_PUBLIC_FORM_ENDPOINT or CONTACT_EMAIL).');
}

/* ───────────────────────── Stage shell ─────────────────────────
   Content fades in when its stage is the active one. The section keeps its full
   100vh so scroll maths (stage k <-> progress k/4) stay exact. */
function Stage({
  index,
  label,
  className = '',
  contentClassName = '',
  backdrop,
  children,
}: {
  index: number;
  label: string;
  className?: string;
  contentClassName?: string;
  backdrop?: ReactNode;
  children: ReactNode;
}) {
  const active = useSpatialStore((s) => s.activeStage === index);
  return (
    <section
      id={`stage-${index}`}
      aria-label={label}
      className={`h-screen w-full ${className}`}
    >
      {backdrop}
      <div className={`stage-content ${contentClassName}`} data-active={active}>
        {children}
      </div>
    </section>
  );
}

/* ───────────────────────── STAGE 00 ───────────────────────── */
const scrollToStage = (stage: number) => {
  const lenis = (window as unknown as { lenis?: Lenis }).lenis;
  if (!lenis) return;
  lenis.scrollTo((stage / 4) * lenis.limit, { duration: 2.2 });
};

function HeroSection() {
  return (
    <Stage
      index={0}
      label="Singularity"
      className="relative flex flex-col justify-center px-10 md:px-24"
      contentClassName="max-w-4xl space-y-6 pointer-events-auto"
      backdrop={<div className="hero-scrim" aria-hidden />}
    >
      <p className="font-mono text-xs tracking-[0.35em] text-[#FF5500] uppercase">
        [00 // SINGULARITY — NON-LINEAR SPATIAL PORTFOLIO]
      </p>
      <h1 className="text-[clamp(2.6rem,7.2vw,6.5rem)] font-extrabold tracking-tighter leading-[0.92] uppercase drop-shadow-[0_4px_30px_rgba(5,5,7,0.55)]">
        ARCHITECTING <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F2EFE9] via-[#A6E1FA] to-[#FF5500]">
          LIVING SYSTEMS.
        </span>
      </h1>
      <p className="max-w-xl text-sm md:text-base text-[#7E828E] font-light leading-relaxed">
        Full-Stack Systems & Creative Graphics Engineer. Building high-concurrency architectures,
        AI vector pipelines, and physics-driven spatial interfaces. Apply scroll thrust to enter the Tesseract.
      </p>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => scrollToStage(1)}
          className="flex cursor-pointer items-center gap-2 bg-[#FF5500] px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.22em] text-[#050507] transition-colors hover:bg-[#F2EFE9]"
        >
          <span>VIEW SELECTED WORKS</span>
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        <a
          href="/Atul_Parmar_Resume.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 border border-white/20 px-5 py-3 font-mono text-xs uppercase tracking-[0.22em] text-[#F2EFE9] transition-colors hover:border-[#FF5500]"
        >
          <FileText className="h-3.5 w-3.5 text-[#FF5500]" />
          <span>RESUME</span>
        </a>
      </div>
    </Stage>
  );
}

/* ───────────────────────── STAGE 01 ───────────────────────── */
function ArchiveSection() {
  const hoveredProjectId = useSpatialStore((s) => s.hoveredProjectId);
  const setHoveredProject = useSpatialStore((s) => s.setHoveredProject);
  const setSelectedProject = useSpatialStore((s) => s.setSelectedProject);

  return (
    <Stage
      index={1}
      label="The Archive"
      className="flex flex-col justify-end pb-20 px-10 md:px-24"
      contentClassName="w-full max-w-6xl mx-auto flex flex-col md:flex-row items-end justify-between gap-6"
    >
      <div data-ui className="glass max-w-md p-6 pointer-events-auto space-y-2">
        <span className="font-mono text-[10px] tracking-[0.25em] text-[#FF5500]">
          [01 // THE ARCHIVE — INTERACTIVE 3D MONOLITHS]
        </span>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          SELECTED ENGINEERING WORKS
        </h2>
        <p className="text-xs text-[#7E828E] leading-relaxed">
          Hover or click directly on the 3D monoliths in space—or select a node below—to inspect its 3-tier system topology.
        </p>
      </div>

      {/* Interactive synchronized monolith index dock */}
      <div data-ui className="grid grid-cols-2 sm:grid-cols-4 gap-3 pointer-events-auto w-full md:w-auto">
        {PROJECTS_ARCHIVE.map((proj, idx) => {
          const isHovered = hoveredProjectId === proj.id;
          return (
            <button
              key={proj.id}
              type="button"
              onMouseEnter={() => {
                setHoveredProject(proj.id);
                soundEngine.triggerPing(580 + idx * 90);
              }}
              onMouseLeave={() => setHoveredProject(null)}
              onFocus={() => setHoveredProject(proj.id)}
              onBlur={() => setHoveredProject(null)}
              onClick={() => {
                setSelectedProject(proj.id);
                soundEngine.triggerPing(880);
              }}
              className={`glass-chip p-4 text-left transition duration-200 cursor-pointer ${
                isHovered
                  ? 'border-[#FF5500] bg-[#FF5500]/15 -translate-y-1'
                  : 'hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] text-[#A6E1FA] mb-1">
                <span>[{proj.index}]</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#FF5500]" />
              </div>
              <div className="font-bold text-sm tracking-wide text-[#F2EFE9]">{proj.title}</div>
              <div className="font-mono text-[9px] text-[#7E828E] truncate mt-0.5">
                {proj.techStack.slice(0, 2).join(' / ')}
              </div>
            </button>
          );
        })}
      </div>
    </Stage>
  );
}

/* ───────────────────────── STAGE 02 ───────────────────────── */
function EngineSection() {
  const activeEngineTier = useSpatialStore((s) => s.activeEngineTier);
  const setActiveEngineTier = useSpatialStore((s) => s.setActiveEngineTier);
  const currentTier = ENGINE_TIERS[activeEngineTier] || ENGINE_TIERS[1];

  return (
    <Stage
      index={2}
      label="The Engine"
      className="flex flex-col justify-end pb-20 px-10 md:px-24"
      contentClassName="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 items-end"
    >
      {/* Left: compact title + tier selector */}
      <div className="lg:col-span-4 space-y-2 pointer-events-auto">
        <div data-ui className="glass px-4 py-3">
          <span className="font-mono text-[10px] tracking-[0.25em] text-[#FF5500] flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" />
            <span>[02 // THE ENGINE]</span>
          </span>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mt-0.5">
            FIRST-PRINCIPLES STACK
          </h2>
        </div>

        {ENGINE_TIERS.map((tier, idx) => {
          const isSelected = activeEngineTier === idx;
          return (
            <button
              key={tier.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                setActiveEngineTier(idx);
                soundEngine.triggerPing(520 + idx * 140);
              }}
              className={`glass-chip w-full px-4 py-2.5 text-left transition duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                isSelected ? 'border-[#FF5500] bg-[#FF5500]/15' : 'hover:border-white/30'
              }`}
            >
              <div className="min-w-0">
                <div className="font-mono text-[9px] tracking-[0.2em] text-[#A6E1FA]">
                  {tier.tierIndex}
                </div>
                <div className="font-bold text-xs text-[#F2EFE9] truncate">{tier.name}</div>
              </div>
              <Cpu className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#FF5500]' : 'text-[#7E828E]'}`} />
            </button>
          );
        })}
      </div>

      {/* Right: active tier readout */}
      <div
        data-ui
        aria-live="polite"
        className="glass-strong border-[#A6E1FA]/25 lg:col-span-8 p-4 pointer-events-auto space-y-3"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
          <span className="font-mono text-xs tracking-[0.2em] text-[#FF5500]">
            {currentTier.tierIndex} // ACTIVE DIAGNOSTIC
          </span>
          <span className="font-mono text-[10px] tracking-[0.15em] text-[#7E828E] text-right">
            {currentTier.subtitle}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {currentTier.nodes.map((node) => (
            <div
              key={node.label}
              className="p-3 border border-white/10 bg-[#121318]/90 space-y-1"
            >
              <div className="font-mono text-[10px] tracking-[0.2em] text-[#A6E1FA]">
                [{node.metric}]
              </div>
              <div className="font-bold text-xs text-[#F2EFE9]">{node.label}</div>
              <p className="text-[11px] text-[#7E828E] leading-relaxed">{node.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </Stage>
  );
}

/* ───────────────────────── STAGE 03 ───────────────────────── */
function ChronologySection() {
  const activeChronologyIndex = useSpatialStore((s) => s.activeChronologyIndex);
  const setActiveChronologyIndex = useSpatialStore((s) => s.setActiveChronologyIndex);
  const currentMilestone =
    CHRONOLOGY_MILESTONES[activeChronologyIndex] || CHRONOLOGY_MILESTONES[0];

  return (
    <Stage
      index={3}
      label="Chronology"
      className="flex flex-col justify-end pb-20 px-10 md:px-24"
      contentClassName="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-end justify-between gap-6"
    >
      {/* Active milestone readout */}
      <div
        data-ui
        aria-live="polite"
        className="glass-strong border-white/15 max-w-xl p-5 pointer-events-auto space-y-2.5"
      >
        <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.25em]">
          <span className="text-[#FF5500] flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5" />
            <span>{currentMilestone.code}</span>
          </span>
          <span className="text-[#A6E1FA]">{currentMilestone.year}</span>
        </div>

        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#F2EFE9]">
          {currentMilestone.title}
        </h2>

        <div className="font-mono text-[11px] tracking-[0.18em] text-[#7E828E]">
          {currentMilestone.organization}
        </div>

        <p className="text-xs md:text-sm text-[#F2EFE9]/85 leading-relaxed pt-1">
          {currentMilestone.description}
        </p>
      </div>

      {/* Time scrubber buttons */}
      <div data-ui className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pointer-events-auto w-full lg:w-auto">
        {CHRONOLOGY_MILESTONES.map((item, idx) => {
          const isSelected = activeChronologyIndex === idx;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                setActiveChronologyIndex(idx);
                soundEngine.triggerPing(440 + idx * 110);
              }}
              className={`glass-chip p-3.5 text-left transition duration-200 cursor-pointer ${
                isSelected
                  ? 'border-[#FF5500] bg-[#FF5500]/15 -translate-y-1'
                  : 'hover:border-white/30'
              }`}
            >
              <div className="font-mono text-[9px] text-[#A6E1FA] truncate">{item.year}</div>
              <div className="font-bold text-xs text-[#F2EFE9] truncate mt-1">{item.title}</div>
            </button>
          );
        })}
      </div>
    </Stage>
  );
}

/* ───────────────────────── STAGE 04 ───────────────────────── */
type SendStatus = 'idle' | 'sending' | 'error';

function ContactSection() {
  const triggerKeystrokePulse = useSpatialStore((s) => s.triggerKeystrokePulse);
  const triggerTransmission = useSpatialStore((s) => s.triggerTransmission);
  const resetTransmission = useSpatialStore((s) => s.resetTransmission);
  const isTransmitting = useSpatialStore((s) => s.isTransmitting);
  const transmissionComplete = useSpatialStore((s) => s.transmissionComplete);

  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [messagePayload, setMessagePayload] = useState('');
  const [website, setWebsite] = useState(''); // honeypot: real users never see or fill this
  const [status, setStatus] = useState<SendStatus>('idle');

  const handleKeystroke = (val: string, setter: (v: string) => void) => {
    setter(val);
    triggerKeystrokePulse();
    // Subtle harmonic keystroke resonance tick
    soundEngine.triggerPing(360 + (val.length % 12) * 32);
  };

  const handleTransmitSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === 'sending' || isTransmitting) return;
    if (!senderName.trim() || !messagePayload.trim()) return;

    // Bots fill the hidden field: fake success, send nothing
    if (website) {
      triggerTransmission();
      return;
    }

    setStatus('sending');
    try {
      await sendMessage({
        name: senderName.trim(),
        email: senderEmail.trim(),
        message: messagePayload.trim(),
      });
      soundEngine.triggerPing(880);
      setStatus('idle');
      triggerTransmission();
    } catch (err) {
      console.error('[contact] send failed:', err);
      setStatus('error');
    }
  };

  const busy = status === 'sending' || isTransmitting;

  return (
    <Stage
      index={4}
      label="Event Horizon"
      className="flex items-center justify-center px-6 md:px-24"
      contentClassName="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
    >
      {/* Left: direct channels */}
      <div data-ui className="glass lg:col-span-5 p-8 pointer-events-auto space-y-6">
        <div>
          <span className="font-mono text-[10px] tracking-[0.28em] text-[#FF5500] uppercase">
            [04 // EVENT HORIZON — DIRECT CHANNELS]
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2">
            INITIATE LINK.
          </h2>
          <p className="text-xs text-[#7E828E] leading-relaxed mt-2">
            Type inside the transmission console to dispatch real-time wave impulses into the Event Horizon shader field.
          </p>
        </div>

        <div className="space-y-3 font-mono text-xs">
          {CHANNELS.map(({ label, href, Icon, iconClass, hoverClass, external }) => (
            <a
              key={label}
              href={href}
              {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
              className={`flex items-center justify-between p-3.5 border border-white/10 bg-[#121318]/70 transition-colors ${hoverClass}`}
            >
              <span className="flex items-center gap-2.5 text-[#F2EFE9]">
                <Icon className={`w-4 h-4 ${iconClass}`} />
                <span>{label}</span>
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#7E828E]" />
            </a>
          ))}
        </div>
      </div>

      {/* Right: keystroke-reactive transmission form */}
      <div data-ui className="glass-strong border-[#FF5500]/30 lg:col-span-7 p-8 md:p-10 pointer-events-auto">
        {transmissionComplete ? (
          <div className="py-10 text-center space-y-5" role="status">
            <CheckCircle2 className="w-12 h-12 text-[#FF5500] mx-auto animate-bounce" />
            <div className="font-mono text-xs tracking-[0.3em] text-[#A6E1FA]">
              [SINGULARITY COLLAPSE CONFIRMED]
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-[#F2EFE9]">
              TRANSMISSION LOCKED IN ORBIT
            </h3>
            <p className="text-xs text-[#7E828E] max-w-md mx-auto leading-relaxed">
              Signal packet from <span className="text-[#F2EFE9]">{senderName}</span> has been encoded and dispatched across the Tesseract horizon.
            </p>
            <button
              type="button"
              onClick={() => {
                setSenderName('');
                setSenderEmail('');
                setMessagePayload('');
                setStatus('idle');
                resetTransmission();
              }}
              className="px-6 py-3 border border-white/20 hover:border-[#FF5500] font-mono text-xs tracking-[0.2em] text-[#F2EFE9] transition-colors cursor-pointer"
            >
              SEND ANOTHER SIGNAL //
            </button>
          </div>
        ) : (
          <form onSubmit={handleTransmitSubmit} className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="font-mono text-xs tracking-[0.22em] text-[#A6E1FA] flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#FF5500]" />
                <span>TRANSMISSION CONSOLE</span>
              </span>
              <span className="font-mono text-[10px] tracking-[0.2em] text-[#7E828E]">
                SHADER RIPPLE // ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label
                  htmlFor="contact-name"
                  className="block font-mono text-[10px] tracking-[0.2em] text-[#7E828E] mb-1.5"
                >
                  01. IDENTIFIER (NAME)
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={senderName}
                  onChange={(e) => handleKeystroke(e.target.value, setSenderName)}
                  placeholder="Commander / Recruiter"
                  className="w-full px-4 py-3 bg-[#121318]/90 border border-white/15 focus:border-[#FF5500] focus:outline-none font-mono text-xs text-[#F2EFE9] placeholder:text-[#7E828E]/50"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-email"
                  className="block font-mono text-[10px] tracking-[0.2em] text-[#7E828E] mb-1.5"
                >
                  02. RETURN FREQUENCY (EMAIL)
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={senderEmail}
                  onChange={(e) => handleKeystroke(e.target.value, setSenderEmail)}
                  placeholder="signal@domain.com"
                  className="w-full px-4 py-3 bg-[#121318]/90 border border-white/15 focus:border-[#A6E1FA] focus:outline-none font-mono text-xs text-[#F2EFE9] placeholder:text-[#7E828E]/50"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="contact-message"
                className="block font-mono text-[10px] tracking-[0.2em] text-[#7E828E] mb-1.5"
              >
                03. PAYLOAD SPECIFICATION (MESSAGE)
              </label>
              <textarea
                id="contact-message"
                name="message"
                rows={3}
                required
                value={messagePayload}
                onChange={(e) => handleKeystroke(e.target.value, setMessagePayload)}
                placeholder="Type here and watch the 3D Event Horizon ripple with every keystroke..."
                className="w-full px-4 py-3 bg-[#121318]/90 border border-white/15 focus:border-[#FF5500] focus:outline-none font-mono text-xs text-[#F2EFE9] placeholder:text-[#7E828E]/50 resize-none"
              />
            </div>

            {/* Honeypot (hidden from people) */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="hidden"
            />

            {status === 'error' && (
              <p role="alert" className="font-mono text-[11px] tracking-[0.1em] text-[#FF5500]">
                [TRANSMISSION FAILED] Signal did not leave orbit. Retry, or use a direct channel on the left.
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-4 bg-[#FF5500] text-[#050507] font-mono text-xs font-bold tracking-[0.25em] uppercase hover:bg-[#F2EFE9] transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {status === 'sending'
                  ? 'ENCODING SIGNAL...'
                  : isTransmitting
                    ? 'COMPRESSING SINGULARITY...'
                    : 'TRANSMIT SIGNAL //'}
              </span>
            </button>
          </form>
        )}
      </div>
    </Stage>
  );
}

/* ───────────────────────── Page ───────────────────────── */
export default function PortfolioSpatialEngine() {
  // Always start at the hero: a restored mid-page scroll would put the content
  // and the 3D camera out of sync with the stage state on reload.
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }, []);

  return (
    <SmoothScroll>
      {/* 0. Cinematic airlock preloader */}
      <PreloaderOverlay />

      {/* 1. Persistent 3D WebGL engine */}
      <SpatialCanvas />

      {/* 2. Persistent telemetry HUD */}
      <TelemetryHUD />

      {/* 3. Deep-dive project case-study portal */}
      <ProjectModal />

      {/* 4. Synchronized 5-stage scroll track (500vh; stage k <-> scroll progress k/4) */}
      <main className="relative z-10 pointer-events-none text-[#F2EFE9] selection:bg-[#FF5500] selection:text-[#050507]">
        <HeroSection />
        <ArchiveSection />
        <EngineSection />
        <ChronologySection />
        <ContactSection />
      </main>
    </SmoothScroll>
  );
}