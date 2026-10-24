import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { appConfig } from '../config/app.config';
import { Listing, LISTING_FIELDS, ListingField } from '../listings/listing';

const SYSTEM_PROMPT =
  'You compare two versions of a competitor product listing and explain what changed ' +
  'in one or two short, plain-English sentences. Mention concrete before/after values ' +
  '(e.g. "Price rose from $29/mo to $39/mo."). Do not mention fields that did not change.';

interface ChatCompletionResponse {
  choices?: { message?: { content?: unknown } }[];
}

/** Thin client for any OpenAI-compatible Chat Completions endpoint. */
@Injectable()
export class LlmService {
  constructor(@Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>) {}

  /** Throws on timeout, non-2xx, or a malformed response. Callers decide how to degrade. */
  async summarizeChange(
    previous: Listing,
    next: Listing,
    changedFields: ListingField[],
  ): Promise<string> {
    const { baseUrl, model, apiKey, timeoutMs } = this.config.llm;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 150,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(previous, next, changedFields) },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`LLM responded ${response.status}: ${body.slice(0, 200)}`);
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim() === '') {
      throw new Error('LLM response had no message content');
    }
    return content.trim();
  }
}

// Changed fields go first so they survive any truncation on the model side.
function buildUserPrompt(previous: Listing, next: Listing, changedFields: ListingField[]): string {
  const changes = changedFields
    .map((field) => `- ${field}: "${previous[field]}" -> "${next[field]}"`)
    .join('\n');
  const describe = (listing: Listing) =>
    LISTING_FIELDS.map((field) => `  ${field}: ${listing[field]}`).join('\n');

  return [
    `Changed fields:\n${changes}`,
    `Previous listing:\n${describe(previous)}`,
    `New listing:\n${describe(next)}`,
  ].join('\n\n');
}
