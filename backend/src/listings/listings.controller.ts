import { Controller, Get } from '@nestjs/common';
import { ListingSourceService } from './listing-source.service';

/** Lets the UI suggest which competitor ids the data source can serve. */
@Controller('sources')
export class ListingsController {
  constructor(private readonly source: ListingSourceService) {}

  @Get()
  list(): { id: string }[] {
    return this.source.knownIds().map((id) => ({ id }));
  }
}
