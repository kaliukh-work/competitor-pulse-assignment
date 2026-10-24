import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/60 ${className}`}>{children}</div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
      {message}
    </div>
  );
}

export function Spinner() {
  return (
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
  );
}

const badgeTones = {
  green: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
  amber: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
  zinc: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/30',
};

export function Badge({ tone, children }: { tone: keyof typeof badgeTones; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}
