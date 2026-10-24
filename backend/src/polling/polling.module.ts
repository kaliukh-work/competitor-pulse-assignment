import { Module } from '@nestjs/common';
import { ListingsModule } from '../listings/listings.module';
import { LlmModule } from '../llm/llm.module';
import { PollingService } from './polling.service';

@Module({
  imports: [ListingsModule, LlmModule],
  providers: [PollingService],
})
export class PollingModule {}
