import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { isListing, Listing } from './listing';

/**
 * Stand-in for a real scraper. Replays canned listings from
 * fixtures/listings.json: each call for a competitor returns the next entry in
 * its sequence, then keeps returning the last entry once exhausted.
 *
 * Cursors live in memory, so they reset on restart (acceptable for a stub).
 */
@Injectable()
export class ListingSourceService {
  private readonly logger = new Logger(ListingSourceService.name);
  private readonly sequences: ReadonlyMap<string, readonly Listing[]>;
  private readonly cursors = new Map<string, number>();

  constructor() {
    const fixturePath = path.join(process.cwd(), 'fixtures', 'listings.json');
    this.sequences = ListingSourceService.load(fixturePath);
    this.logger.log(`Loaded ${this.sequences.size} competitor fixtures from ${fixturePath}`);
  }

  has(competitorId: string): boolean {
    return this.sequences.has(competitorId);
  }

  knownIds(): string[] {
    return [...this.sequences.keys()];
  }

  /** Returns null for ids the source knows nothing about. */
  async fetchListing(competitorId: string): Promise<Listing | null> {
    const sequence = this.sequences.get(competitorId);
    if (!sequence) return null;

    const cursor = this.cursors.get(competitorId) ?? 0;
    const listing = sequence[Math.min(cursor, sequence.length - 1)];
    if (cursor < sequence.length) this.cursors.set(competitorId, cursor + 1);

    return { ...listing };
  }

  // Fail fast at boot on a missing or malformed fixture file.
  private static load(fixturePath: string): Map<string, Listing[]> {
    const parsed: unknown = JSON.parse(readFileSync(fixturePath, 'utf8'));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(`${fixturePath}: expected an object keyed by competitor id`);
    }

    const sequences = new Map<string, Listing[]>();
    for (const [id, entries] of Object.entries(parsed)) {
      if (!Array.isArray(entries) || entries.length === 0 || !entries.every(isListing)) {
        throw new Error(`${fixturePath}: "${id}" must be a non-empty array of listings`);
      }
      sequences.set(id, entries);
    }
    return sequences;
  }
}
