import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CompetitorsModule } from './competitors/competitors.module';
import { appConfig } from './config/app.config';
import { ListingsModule } from './listings/listings.module';
import { PollingModule } from './polling/polling.module';
import { PrismaModule } from './prisma/prisma.module';

@Controller('health')
class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    ScheduleModule.forRoot(),
    PrismaModule,
    ListingsModule,
    CompetitorsModule,
    PollingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
