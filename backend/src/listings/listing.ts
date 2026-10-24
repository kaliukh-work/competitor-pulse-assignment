export const LISTING_FIELDS = ['title', 'tagline', 'price', 'description'] as const;

export type ListingField = (typeof LISTING_FIELDS)[number];

export type Listing = Record<ListingField, string>;

export function isListing(value: unknown): value is Listing {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return LISTING_FIELDS.every((field) => typeof record[field] === 'string');
}

// Collapse whitespace so cosmetic reformatting doesn't count as a change
// (and doesn't cost an LLM call).
function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Returns the fields that differ between two listings. An empty array means
 * "unchanged"; a missing `previous` (first-ever fetch) is also "unchanged".
 */
export function diffListings(previous: Listing | null, next: Listing): ListingField[] {
  if (!previous) return [];
  return LISTING_FIELDS.filter((field) => normalize(previous[field]) !== normalize(next[field]));
}
