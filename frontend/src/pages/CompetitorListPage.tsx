import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Competitor } from '../api';
import { Card, ErrorBanner, Spinner } from '../components/ui';

export function CompetitorListPage() {
  const [competitors, setCompetitors] = useState<Competitor[] | null>(null);
  const [sources, setSources] = useState<Competitor[]>([]);
  const [newId, setNewId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Two-step remove: first click arms, second click deletes (history is lost on delete).
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setCompetitors(await api.listCompetitors());
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void refresh();
    api.listSources().then(setSources, () => setSources([]));
  }, [refresh]);

  async function add(id: string) {
    const trimmed = id.trim().toLowerCase();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.addCompetitor(trimmed);
      setNewId('');
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    setConfirmingId(null);
    try {
      await api.removeCompetitor(id);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void add(newId);
  };

  const trackedIds = new Set(competitors?.map((c) => c.id));
  const suggestions = sources.filter((s) => !trackedIds.has(s.id));

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Competitors</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Each tracked competitor is polled on a schedule. Changes get an AI-written summary.
        </p>
      </section>

      <Card className="p-4">
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            placeholder="Competitor id, e.g. acme-crm"
            list="known-sources"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
          />
          <datalist id="known-sources">
            {suggestions.map((s) => (
              <option key={s.id} value={s.id} />
            ))}
          </datalist>
          <button
            type="submit"
            disabled={submitting || !newId.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting && <Spinner />}
            Track
          </button>
        </form>

        {suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-zinc-500">Available:</span>
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => void add(s.id)}
                disabled={submitting}
                className="rounded-full border border-zinc-700 px-2.5 py-0.5 text-zinc-400 transition hover:border-emerald-500/50 hover:text-emerald-300"
              >
                + {s.id}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-3">
            <ErrorBanner message={error} />
          </div>
        )}
      </Card>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Tracked{competitors ? ` (${competitors.length})` : ''}
        </h2>

        {competitors === null ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Spinner /> Loading…
          </div>
        ) : competitors.length === 0 ? (
          <Card className="px-4 py-10 text-center text-sm text-zinc-500">
            Nothing tracked yet. Add a competitor above to start collecting snapshots.
          </Card>
        ) : (
          <Card className="divide-y divide-zinc-800">
            {competitors.map((c) => (
              <div key={c.id} className="group flex items-center justify-between px-4 py-3">
                <Link
                  to={`/competitors/${encodeURIComponent(c.id)}`}
                  className="flex items-center gap-3 font-mono text-sm text-zinc-200 transition hover:text-emerald-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                  {c.id}
                  <span className="text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-emerald-400">
                    →
                  </span>
                </Link>
                <div className="flex items-center gap-2">
                  {confirmingId === c.id && (
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="rounded-md px-2.5 py-1 text-xs text-zinc-400 transition hover:text-zinc-200"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={() => (confirmingId === c.id ? void remove(c.id) : setConfirmingId(c.id))}
                    className={
                      confirmingId === c.id
                        ? 'rounded-md bg-red-500/90 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-red-500'
                        : 'rounded-md px-2.5 py-1 text-xs text-zinc-500 transition hover:bg-red-500/10 hover:text-red-300'
                    }
                  >
                    {confirmingId === c.id ? 'Delete history' : 'Remove'}
                  </button>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
