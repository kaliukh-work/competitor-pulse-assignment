import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CompetitorsService, SnapshotView } from './competitors.service';
import { CreateCompetitorDto } from './dto/create-competitor.dto';

const MAX_SNAPSHOTS = 500;

@Controller('competitors')
export class CompetitorsController {
  constructor(private readonly competitors: CompetitorsService) {}

  @Get()
  list(): Promise<{ id: string }[]> {
    return this.competitors.list();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCompetitorDto): Promise<{ id: string }> {
    return this.competitors.create(dto.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.competitors.remove(id);
  }

  /** Newest first. `?limit=` caps the page size (default 200, max 500). */
  @Get(':id/snapshots')
  snapshots(
    @Param('id') id: string,
    @Query('limit', new DefaultValuePipe(200), ParseIntPipe) limit: number,
  ): Promise<SnapshotView[]> {
    return this.competitors.snapshots(id, Math.min(Math.max(limit, 1), MAX_SNAPSHOTS));
  }
}
