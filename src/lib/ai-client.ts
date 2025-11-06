import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

export type AIProvider = 'openai' | 'anthropic';

export type AIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AIResponse = {
  content: string;
  model: string;
};

export function validateJSON(
  data: any,
  schema: any
): { valid: boolean; errors: string[] } {
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid && validate.errors) {
    const errors = validate.errors.map(
      (err) => `${err.instancePath || '/'} ${err.message}`
    );
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

/**
 * Calls your Supabase edge function `ai-proxy` with provider hints that
 * reduce invalid JSON responses (OpenAI JSON mode, conservative temps).
 *
 * The proxy should pass these through:
 *  - OpenAI: response_format: { type: "json_object" }, temperature/top_p
 *  - Anthropic: (no native json mode) – rely on system prompt guardrails
 */
export async function callAI(
  messages: AIMessage[],
  provider: AIProvider = 'anthropic',
  options: {
    temperature?: number;
    maxTokens?: number;
    retries?: number;
    topP?: number;
    timeoutMs?: number;
  } = {}
): Promise<AIResponse> {
  const temperature = options.temperature ?? 0.2;
  const maxTokens = options.maxTokens ?? 4000;
  const maxRetries = options.retries ?? 3;
  const topP = options.topP ?? 1.0;
  const timeoutMs = options.timeoutMs ?? 60_000;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const apiUrl = `${supabaseUrl}/functions/v1/ai-proxy`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          provider,
          messages,
          temperature,
          topP,
          maxTokens,
          // Hints for the proxy to pass down to providers
          providerHints: buildProviderHints(provider)
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI proxy error: ${errorText}`);
      }

      const data = await response.json();
      return {
        content: String(data.content ?? ''),
        model: String(data.model ?? '')
      };
    } catch (error: any) {
      // Normalize abort
      let err: Error;
      if (error?.name === 'AbortError') {
        err = new Error(`Request timeout after ${Math.round(timeoutMs / 1000)}s`);
      } else {
        err = error instanceof Error ? error : new Error('Unknown error');
      }
      lastError = err;

      // Exponential backoff with jitter
      if (attempt < maxRetries - 1) {
        const backoffMs = (attempt + 1) * 1000 + Math.floor(Math.random() * 250);
        await sleep(backoffMs);
        continue;
      }
    }
  }

  throw lastError || new Error('Failed to call AI after retries');
}

/**
 * Safer JSON parser:
 * 1) Quick trim & code-fence removal
 * 2) Try native JSON.parse
 * 3) Try to locate the first balanced {...} / [...] block and parse it
 * 4) Normalize curly quotes → straight quotes, then retry
 */
export function parseJSONResponse(response: string): any {
  let cleaned = (response ?? '').trim();

  // Remove common code fences
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  // Fast path
  try {
    return JSON.parse(cleaned);
  } catch {
    // continue
  }

  // Try to extract a balanced JSON object/array
  const extracted = extractFirstJsonBlock(cleaned);
  if (extracted) {
    try {
      return JSON.parse(extracted);
    } catch {
      // fallthrough
    }
    // Normalize fancy quotes and retry
    const normalized = normalizeQuotes(extracted);
    return JSON.parse(normalized);
  }

  // Final attempt with normalized quotes
  const normalizedWhole = normalizeQuotes(cleaned);
  return JSON.parse(normalizedWhole);
}

/* ------------------------ helpers ------------------------ */

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Provider hints sent to the proxy to reduce invalid JSON.
 * Your edge function should pass these hints through to the model calls.
 */
function buildProviderHints(provider: AIProvider) {
  if (provider === 'openai') {
    return {
      // For Chat Completions API:
      response_format: { type: 'json_object' },
      // Strong nudge not to include markdown fences:
      forbid_markdown: true
    };
  }
  // Anthropic has no native JSON mode; rely on system rules already present.
  return {
    forbid_markdown: true
  };
}

/**
 * Extract the first balanced JSON object or array from a string.
 * Scans for either `{` ... `}` or `[` ... `]`, respecting nesting and quotes.
 */
function extractFirstJsonBlock(s: string): string | null {
  const startIdx = findFirstOf(s, ['{', '[']);
  if (startIdx === -1) return null;

  const openChar = s[startIdx];
  const closeChar = openChar === '{' ? '}' : ']';

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIdx; i < s.length; i++) {
    const ch = s[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === openChar) depth++;
    if (ch === closeChar) depth--;

    if (depth === 0) {
      return s.slice(startIdx, i + 1).trim();
    }
  }

  return null;
}

function findFirstOf(s: string, chars: string[]): number {
  let min = -1;
  for (const c of chars) {
    const idx = s.indexOf(c);
    if (idx !== -1 && (min === -1 || idx < min)) {
      min = idx;
    }
  }
  return min;
}

function normalizeQuotes(s: string): string {
  // Replace curly/smart quotes with straight quotes
  return s
    .replace(/\u201C|\u201D|\u201E|\u201F/g, '"')
    .replace(/\u2018|\u2019|\u201A|\u201B/g, "'");
}
