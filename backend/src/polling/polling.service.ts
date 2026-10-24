import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SummaryStatus } from '@prisma/client';
import { CronJob } from 'cron';
import { appConfig } from '../config/app.config';
import { diffListings, Listing, ListingField } from '../listings/listing';
import { ListingSourceService } from '../listings/listing-source.service';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import { mapWithConcurrency } from './map-with-concurrency';

const JOB_NAME = 'poll-competitors';

/**
 * Periodically snapshots every tracked competitor.
 *
 * Ordering guarantee: the snapshot row is committed BEFORE the LLM is called.
 * The LLM call runs detached from the tick and only ever patches `summary` /
 * `summaryStatus` on that existing row, so a slow, failing, or crashed LLM
 * call can delay a summary but never lose or corrupt listing data.
 */
@Injectable()
export class PollingService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(PollingService.name);
  private tickInProgress = false;
  private readonly pendingSummaries = new Set<Promise<void>>();

  constructor(
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly prisma: PrismaService,
    private readonly source: ListingSourceService,
    private readonly llm: LlmService,
  ) {}

  onApplicationBootstrap(): void {
    const { cron } = this.config.polling;
    // CronJob.from throws on an invalid expression, so a bad POLL_CRON fails at boot.
    const job = CronJob.from({ cronTime: cron, onTick: () => this.tick(), start: false });
    this.schedulerRegistry.addCronJob(JOB_NAME, job);
    job.start();
    this.logger.log(`Polling scheduled with cron "${cron}"`);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.schedulerRegistry.doesExist('cron', JOB_NAME)) {
      await this.schedulerRegistry.getCronJob(JOB_NAME).stop();
    }
    // Let in-flight summaries land rather than leaving rows stuck in PENDING.
    await Promise.allSettled(this.pendingSummaries);
  }

  async tick(): Promise<void> {
    // A tick only awaits fetch + diff + insert (LLM calls are detached), so
    // overlap means the DB or source is slow. Skip instead of piling up.
    if (this.tickInProgress) {
      this.logger.warn('Previous poll still running; skipping this tick');
      return;
    }
    this.tickInProgress = true;
    const startedAt = Date.now();
    try {
      const competitors = await this.prisma.competitor.findMany({ select: { id: true } });
      await mapWithConcurrency(competitors, this.config.polling.concurrency, ({ id }) =>
        // Isolate failures so one bad competitor doesn't abort the batch.
        this.pollCompetitor(id).catch((err: unknown) =>
          this.logger.error(`Polling "${id}" failed: ${errorMessage(err)}`),
        ),
      );
      this.logger.debug(`Polled ${competitors.length} competitors in ${Date.now() - startedAt}ms`);
    } catch (err) {
      this.logger.error(`Poll tick failed: ${errorMessage(err)}`);
    } finally {
      this.tickInProgress = false;
    }
  }

  async pollCompetitor(competitorId: string): Promise<void> {
    const listing = await this.source.fetchListing(competitorId);
    if (!listing) {
      this.logger.warn(`Data source has no listing for "${competitorId}"; skipping`);
      return;
    }

    const previous = await this.prisma.snapshot.findFirst({
      where: { competitorId },
      orderBy: { fetchedAt: 'desc' },
      select: { title: true, tagline: true, price: true, description: true },
    });

    const changedFields = diffListings(previous, listing);
    const changed = changedFields.length > 0;

    // 1. Persist unconditionally, before any LLM work.
    const snapshot = await this.prisma.snapshot.create({
      data: {
        competitorId,
        ...listing,
        changed,
        summary: null,
        summaryStatus: changed ? SummaryStatus.PENDING : SummaryStatus.NONE,
      },
      select: { id: true },
    });

    // 2. Only pay for an LLM call when something actually changed.
    if (changed && previous) {
      this.logger.log(`"${competitorId}" changed: ${changedFields.join(', ')}`);
      this.track(this.summarize(snapshot.id, previous, listing, changedFields));
    }
  }

  // Never rejects: every failure path ends in a FAILED status (or a log line).
  private async summarize(
    snapshotId: string,
    previous: Listing,
    next: Listing,
    changedFields: ListingField[],
  ): Promise<void> {
    try {
      const summary = await this.llm.summarizeChange(previous, next, changedFields);
      // updateMany (not update): if the competitor was deleted meanwhile, the
      // row is gone and this is a harmless no-op instead of a P2025 error.
      await this.prisma.snapshot.updateMany({
        where: { id: snapshotId },
        data: { summary, summaryStatus: SummaryStatus.DONE },
      });
    } catch (err) {
      this.logger.warn(`Summary for snapshot ${snapshotId} failed: ${errorMessage(err)}`);
      await this.prisma.snapshot
        .updateMany({
          where: { id: snapshotId },
          data: { summary: null, summaryStatus: SummaryStatus.FAILED },
        })
        .catch((dbErr: unknown) =>
          this.logger.error(`Could not mark ${snapshotId} FAILED: ${errorMessage(dbErr)}`),
        );
    }
  }

  private track(task: Promise<void>): void {
    this.pendingSummaries.add(task);
    void task.finally(() => this.pendingSummaries.delete(task));
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.name === 'TimeoutError' ? 'request timed out' : err.message;
  }
  return String(err);
}
