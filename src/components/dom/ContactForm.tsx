'use client';

import { FormEvent, useState } from 'react';
import { ComponentType } from 'react';
import {
  ArrowUpRight,
  Send,
  CheckCircle2,
  Terminal,
  Globe,
  Code2,
  Mail,
  FileText,
} from 'lucide-react';
import AvailabilityBadge from '@/components/dom/AvailabilityBadge';
import { useSpatialStore } from '@/store/useSpatialStore';
import { soundEngine } from '@/utils/soundEngine';

/* ───────────────────────── Contact configuration ─────────────────────────
   1. Set NEXT_PUBLIC_FORM_ENDPOINT in .env.local (e.g. a Formspree URL) so the
      form really sends. Restart `npm run dev` after changing env files.
   2. Fill in LINKEDIN_URL and CONTACT_EMAIL. Empty values are hidden, not shown broken.
   With no endpoint, the form falls back to opening the visitor's mail app (needs CONTACT_EMAIL). */
// const FORM_ENDPOINT = process.env.NEXT_PUBLIC_FORM_ENDPOINT ?? '';
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

export const CHANNELS: Channel[] = [
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

export async function sendMessage(payload: ContactPayload) {
  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Contact API responded ${res.status}`);
}

type SendStatus = 'idle' | 'sending' | 'error';

/**
 * Self-contained contact form with direct channels sidebar.
 * Used in both the WebGL ContactSection (Stage 04) and StaticPortfolio.
 */
export default function ContactForm() {
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
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
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

          {/* ─── ADDED: Availability Badge in Contact Section ─── */}
          <AvailabilityBadge className="mt-3" />
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
    </div>
  );
}

