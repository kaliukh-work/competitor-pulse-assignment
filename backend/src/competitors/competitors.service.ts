import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ListingSourceService } from '../listings/listing-source.service';
import { PrismaService } from '../prisma/prisma.service';

const snapshotSelect = {
  id: true,
  fetchedAt: true,
  title: true,
  tagline: true,
  price: true,
  description: true,
  changed: true,
  summary: true,
  summaryStatus: true,
} satisfies Prisma.SnapshotSelect;

export type SnapshotView = Prisma.SnapshotGetPayload<{ select: typeof snapshotSelect }>;

function isPrismaError(err: unknown, code: string): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === code;
}

@Injectable()
export class CompetitorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly source: ListingSourceService,
  ) {}

  list(): Promise<{ id: string }[]> {
    return this.prisma.competitor.findMany({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(id: string): Promise<{ id: string }> {
    // Tracking an id the data source can't serve would just produce an empty
    // timeline forever, so reject it up front.
    if (!this.source.has(id)) {
      throw new BadRequestException(
        `Unknown competitor "${id}". Available: ${this.source.knownIds().join(', ')}`,
      );
    }
    try {
      return await this.prisma.competitor.create({ data: { id }, select: { id: true } });
    } catch (err) {
      if (isPrismaError(err, 'P2002')) {
        throw new ConflictException(`Competitor "${id}" is already tracked`);
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      // Snapshots go with it via ON DELETE CASCADE.
      await this.prisma.competitor.delete({ where: { id } });
    } catch (err) {
      if (isPrismaError(err, 'P2025')) {
        throw new NotFoundException(`Competitor "${id}" is not tracked`);
      }
      throw err;
    }
  }

  async snapshots(id: string, limit: number): Promise<SnapshotView[]> {
    const competitor = await this.prisma.competitor.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!competitor) throw new NotFoundException(`Competitor "${id}" is not tracked`);

    return this.prisma.snapshot.findMany({
      where: { competitorId: id },
      orderBy: { fetchedAt: 'desc' },
      take: limit,
      select: snapshotSelect,
    });
  }
}
