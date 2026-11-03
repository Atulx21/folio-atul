'use client';

import { useSpatialStore } from '@/store/useSpatialStore';
import { ProfileContent } from '@/components/dom/ProfilePanel';
import ContactForm from '@/components/dom/ContactForm';
import AvailabilityBadge from '@/components/dom/AvailabilityBadge';
import { HERO_STACK, PROFILE } from '@/data/profileData';
import { FileText } from 'lucide-react';

const RESUME_URL = 'https://drive.google.com/file/d/1C_2MMx7_-6ZxacXWuX2dqA-kJuSRlTnW/view?usp=drive_link';
const GITHUB_URL = 'https://github.com/Atulx21';
const LINKEDIN_URL = 'https://www.linkedin.com/in/atul-parmar/';

/**
 * Static (no WebGL, no Lenis) version of the portfolio.
 * Normal document flow — native browser scrolling.
 * All props.onSwitchTo3D is only rendered when hasWebGL is true.
 */
export default function StaticPortfolio({ hasWebGL }: { hasWebGL: boolean }) {
  const setSelectedProject = useSpatialStore((s) => s.setSelectedProject);

  const switchTo3D = () => {
    try { localStorage.removeItem('portfolio:view'); } catch { /* ignore */ }
    window.location.reload();
  };

  return (
    <div
      className="min-h-screen text-[#F2EFE9] selection:bg-[#FF5500] selection:text-[#050507]"
      style={{
        background:
          '#050507 radial-gradient(ellipse 80% 50% at 20% 30%, rgba(255,85,0,0.06) 0%, transparent 60%),' +
          'radial-gradient(ellipse 70% 60% at 80% 70%, rgba(166,225,250,0.05) 0%, transparent 60%)',
      }}
    >
      {/* ── Slim sticky header ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-white/10 bg-[#050507]/90 px-6 py-3 backdrop-blur-sm md:px-12">
        <span className="font-mono text-xs tracking-[0.28em] text-[#A6E1FA] uppercase">
          {PROFILE.name.toUpperCase()}{' // PORTFOLIO'}
        </span>
        <nav aria-label="Header links" className="flex items-center gap-3 font-mono text-[10px] tracking-[0.2em]">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#7E828E] transition-colors hover:text-[#FF5500]"
          >
            GITHUB
          </a>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#7E828E] transition-colors hover:text-[#FF5500]"
          >
            LINKEDIN
          </a>
          <a
            href={RESUME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 border border-white/15 px-3 py-1.5 text-[#F2EFE9] transition-colors hover:border-[#FF5500]"
          >
            <FileText className="h-3 w-3 text-[#FF5500]" />
            <span>RESUME</span>
          </a>
          {hasWebGL && (
            <button
              type="button"
              onClick={switchTo3D}
              className="cursor-pointer border border-[#FF5500]/60 bg-[#FF5500]/10 px-3 py-1.5 text-[#FF5500] transition-colors hover:bg-[#FF5500]/20"
            >
              SWITCH TO 3D VIEW
            </button>
          )}
        </nav>
      </header>

      {/* ── Hero ── */}
      <section
        aria-label="Hero"
        className="px-6 py-20 md:px-12 md:py-32"
      >
        <div className="mx-auto max-w-4xl space-y-6">
          <p className="font-mono text-xs tracking-[0.35em] text-[#FF5500] uppercase">
            [PORTFOLIO // STATIC VIEW]
          </p>
          <h1 className="text-[clamp(2.6rem,7.2vw,6.5rem)] font-extrabold tracking-tighter leading-[0.92] uppercase">
            ATUL <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F2EFE9] via-[#A6E1FA] to-[#FF5500]">
              PARMAR
            </span>
          </h1>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#FF5500]">
            {PROFILE.title}
          </p>
          <AvailabilityBadge />
          <p className="max-w-xl text-sm md:text-base text-[#7E828E] font-light leading-relaxed">
            {PROFILE.summary[0]}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href={RESUME_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border border-[#FF5500] bg-[#FF5500]/10 px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.22em] text-[#F2EFE9] transition-colors hover:bg-[#FF5500]/25"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>RESUME</span>
            </a>
            <a
              href="#profile-summary"
              className="flex items-center gap-2 bg-[#FF5500] px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.22em] text-[#050507] transition-colors hover:bg-[#F2EFE9]"
            >
              VIEW FULL PROFILE
            </a>
          </div>
          <ul aria-label="Core tech stack" className="flex max-w-2xl flex-wrap gap-1.5 pt-1">
            {HERO_STACK.map((t) => (
              <li
                key={t}
                className="border border-white/10 bg-[#050507]/60 px-2.5 py-1 font-mono text-[10px] tracking-wider text-[#A6E1FA]"
              >
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Profile content ── */}
      <section aria-label="Profile" className="px-6 pb-24 md:px-12">
        <div className="mx-auto max-w-5xl space-y-12">
          <ProfileContent onOpenProject={(id) => setSelectedProject(id)} />
        </div>
      </section>

      {/* ── Contact ── */}
      <section
        aria-label="Contact"
        id="contact"
        className="border-t border-white/10 px-6 py-20 md:px-12"
      >
        <ContactForm />
      </section>

      <footer className="border-t border-white/10 px-6 py-6 text-center font-mono text-[10px] tracking-[0.25em] text-[#7E828E]">
        {PROFILE.name.toUpperCase()}{' // ALL SYSTEMS NOMINAL'}
      </footer>
    </div>
  );
}
