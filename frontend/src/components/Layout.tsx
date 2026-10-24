import { Link, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-zinc-100">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            CompetitorPulse
          </Link>
          <span className="text-sm text-zinc-500">Track competitor listings over time</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
