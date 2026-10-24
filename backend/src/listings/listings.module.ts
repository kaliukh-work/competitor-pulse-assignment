import { Module } from '@nestjs/common';
import { ListingSourceService } from './listing-source.service';
import { ListingsController } from './listings.controller';

@Module({
  controllers: [ListingsController],
  providers: [ListingSourceService],
  exports: [ListingSourceService],
})
export class ListingsModule {}
