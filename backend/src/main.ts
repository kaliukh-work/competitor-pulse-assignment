import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appConfig } from './config/app.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  // Triggers onApplicationShutdown so pending LLM summaries can finish on SIGTERM.
  app.enableShutdownHooks();

  const { port } = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  await app.listen(port, '0.0.0.0');
  Logger.log(`API listening on :${port}/api`, 'Bootstrap');
}

void bootstrap();
