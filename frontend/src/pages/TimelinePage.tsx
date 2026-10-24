import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError, LISTING_FIELDS, type ListingField, type Snapshot } from '../api';
import { Badge, Card, ErrorBanner, Spinner } from '../components/ui';

const REFRESH_MS = 5000;

export function TimelinePage() {
  const { id = '' } = useParams();
  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [hideUnchanged, setHideUnchanged] = useState(false);

  // Poll so new snapshots and PENDING -> DONE/FAILED summaries show up live.
  useEffect(() => {
    let controller: AbortController | undefined;
    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        setSnapshots(await api.listSnapshots(id, controller.signal));
        setError(null);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError((err as Error).message);
      }
    };
    void load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      clearInterval(timer);
      controller?.abort();
    };
  }, [id]);

  if (notFound) {
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorBanner message={`"${id}" is not being tracked.`} />
      </div>
    );
  }

  const changeCount = snapshots?.filter((s) => s.changed).length ?? 0;
  const visible = snapshots
    ?.map((snapshot, i) => ({ snapshot, previous: snapshots[i + 1] }))
    .filter(({ snapshot }) => !hideUnchanged || snapshot.changed);

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight text-zinc-100">{id}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
            {snapshots
              ? `${snapshots.length} snapshots · ${changeCount} changes`
              : 'Loading snapshots…'}
            <span className="text-zinc-700">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              live
            </span>
          </p>
        </div>
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={hideUnchanged}
            onChange={(e) => setHideUnchanged(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-emerald-500"
          />
          Only show changes
        </label>
      </div>

      {error && <ErrorBanner message={error} />}

      {visible === undefined ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Spinner /> Loading…
        </div>
      ) : visible.length === 0 ? (
        <Card className="px-4 py-10 text-center text-sm text-zinc-500">
          {snapshots?.length
            ? 'No changes detected yet.'
            : 'No snapshots yet. The first one will appear after the next scheduled poll.'}
        </Card>
      ) : (
        <ol className="relative space-y-4 border-l border-zinc-800 pl-6">
          {visible.map(({ snapshot, previous }) => (
            <SnapshotCard key={snapshot.id} snapshot={snapshot} previous={previous} />
          ))}
        </ol>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/" className="inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-200">
      ← All competitors
    </Link>
  );
}

function SnapshotCard({ snapshot, previous }: { snapshot: Snapshot; previous?: Snapshot }) {
  const changedFields = new Set<ListingField>(
    snapshot.changed && previous ? LISTING_FIELDS.filter((f) => snapshot[f] !== previous[f]) : [],
  );

  return (
    <li className="relative">
      <span
        className={`absolute -left-7.75 top-5 h-3 w-3 rounded-full ring-4 ring-zinc-950 ${
          snapshot.changed ? 'bg-emerald-400' : 'bg-zinc-700'
        }`}
      />
      <Card className={`p-4 ${snapshot.changed ? '' : 'opacity-75'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <time dateTime={snapshot.fetchedAt} className="text-sm text-zinc-300" title={snapshot.fetchedAt}>
            {new Date(snapshot.fetchedAt).toLocaleString()}
            <span className="ml-2 text-zinc-600">{relativeTime(snapshot.fetchedAt)}</span>
          </time>
          {snapshot.changed ? <Badge tone="green">Changed</Badge> : <Badge tone="zinc">No change</Badge>}
        </div>

        {snapshot.changed && <Summary snapshot={snapshot} />}

        <dl className="mt-4 grid grid-cols-[6rem_1fr] gap-x-4 gap-y-2 text-sm">
          {LISTING_FIELDS.map((field) => {
            const isChanged = changedFields.has(field);
            return (
              <div key={field} className="contents">
                <dt className="pt-0.5 text-xs uppercase tracking-wider text-zinc-500">{field}</dt>
                <dd className={isChanged ? 'text-zinc-100' : 'text-zinc-400'}>
                  {isChanged && previous && (
                    <span className="mr-2 text-zinc-600 line-through decoration-red-400/60">
                      {previous[field]}
                    </span>
                  )}
                  <span className={isChanged ? 'rounded bg-emerald-500/10 px-1 text-emerald-200' : ''}>
                    {snapshot[field]}
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>
      </Card>
    </li>
  );
}

function Summary({ snapshot }: { snapshot: Snapshot }) {
  switch (snapshot.summaryStatus) {
    case 'DONE':
      return (
        <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-emerald-400/80">
            ✦ AI summary
          </div>
          <p className="text-sm leading-relaxed text-zinc-200">{snapshot.summary}</p>
        </div>
      );
    case 'PENDING':
      return (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-400">
          <Spinner /> Generating summary…
        </div>
      );
    default:
      return (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-sm text-amber-200/90">
          <Badge tone="amber">Summary unavailable</Badge>
          The LLM call failed or timed out. The listing data below is intact.
        </div>
      );
  }
}

// Pinned to English to match the rest of the UI copy.
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function relativeTime(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(seconds, 'second');
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour');
  return rtf.format(Math.round(seconds / 86400), 'day');
}
