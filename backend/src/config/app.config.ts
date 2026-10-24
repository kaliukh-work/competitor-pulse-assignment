import { registerAs } from '@nestjs/config';

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got "${raw}"`);
  }
  return value;
}

export const appConfig = registerAs('app', () => ({
  port: intFromEnv('PORT', 3000),
  polling: {
    // Six-field cron expression (seconds first), e.g. "*/30 * * * * *".
    cron: process.env.POLL_CRON || '*/30 * * * * *',
    concurrency: intFromEnv('POLL_CONCURRENCY', 10),
  },
  llm: {
    baseUrl: (process.env.LLM_BASE_URL || 'http://mock-llm:4001/v1').replace(/\/+$/, ''),
    model: process.env.LLM_MODEL || 'mock-llm',
    apiKey: process.env.LLM_API_KEY || undefined,
    timeoutMs: intFromEnv('LLM_TIMEOUT_MS', 10_000),
  },
}));

export type AppConfig = ReturnType<typeof appConfig>;
