import { AVAILABILITY } from '@/data/profileData';

export default function AvailabilityBadge({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-0.5 border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-[#F2EFE9] ${className}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      <span className="font-bold">{AVAILABILITY.status}</span>
      <span className="text-[#7E828E]">//</span>
      <span className="text-[#F2EFE9]/80">{AVAILABILITY.detail}</span>
    </div>
  );
}