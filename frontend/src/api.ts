export type SummaryStatus = 'NONE' | 'PENDING' | 'DONE' | 'FAILED';

export interface Competitor {
  id: string;
}

export interface Snapshot {
  id: string;
  fetchedAt: string;
  title: string;
  tagline: string;
  price: string;
  description: string;
  changed: boolean;
  summary: string | null;
  summaryStatus: SummaryStatus;
}

export const LISTING_FIELDS = ['title', 'tagline', 'price', 'description'] as const;
export type ListingField = (typeof LISTING_FIELDS)[number];

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    // Nest errors look like { message: string | string[] }.
    const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join('; ') : body?.message;
    throw new ApiError(res.status, message ?? `Request failed (${res.status})`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const api = {
  listCompetitors: () => request<Competitor[]>('/competitors'),
  listSources: () => request<Competitor[]>('/sources'),
  addCompetitor: (id: string) =>
    request<Competitor>('/competitors', { method: 'POST', body: JSON.stringify({ id }) }),
  removeCompetitor: (id: string) =>
    request<void>(`/competitors/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  listSnapshots: (id: string, signal?: AbortSignal) =>
    request<Snapshot[]>(`/competitors/${encodeURIComponent(id)}/snapshots`, { signal }),
};
