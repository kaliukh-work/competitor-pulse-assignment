import { Module } from '@nestjs/common';
import { ListingsModule } from '../listings/listings.module';
import { CompetitorsController } from './competitors.controller';
import { CompetitorsService } from './competitors.service';

@Module({
  imports: [ListingsModule],
  controllers: [CompetitorsController],
  providers: [CompetitorsService],
})
export class CompetitorsModule {}
