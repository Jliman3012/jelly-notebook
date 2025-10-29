import { setTimeout as delay } from 'timers/promises';

type FetchFn = typeof fetch;

export interface FetchWithRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  logger?: { warn: (msg: unknown, ...args: unknown[]) => void; error: (msg: unknown, ...args: unknown[]) => void };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: unknown,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class RequestQueue {
  private nextAvailableAt = 0;
  private tail: Promise<void> = Promise.resolve();

  constructor(private readonly minIntervalMs: number) {}

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = async () => {
      const waitTime = this.nextAvailableAt - Date.now();
      if (waitTime > 0) {
        await delay(waitTime);
      }
      try {
        return await task();
      } finally {
        this.nextAvailableAt = Date.now() + this.minIntervalMs;
      }
    };

    const execution = this.tail.then(run, run);
    this.tail = execution.then(
      () => {
        /* noop */
      },
      () => {
        /* noop to keep chain alive */
      }
    );
    return execution;
  }
}

export const fetchJsonWithRetry = async <T>(
  fetchFn: FetchFn,
  input: RequestInfo | URL,
  init: RequestInit,
  options: FetchWithRetryOptions = {}
): Promise<T> => {
  const { maxRetries = 3, baseDelayMs = 250, logger } = options;
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      const response = await fetchFn(input, init);
      if (!response.ok) {
        const bodyText = await response.text();
        let parsedBody: unknown;
        try {
          parsedBody = bodyText ? JSON.parse(bodyText) : undefined;
        } catch {
          parsedBody = bodyText;
        }
        const retryable = response.status >= 500 || response.status === 429;
        throw new ApiError(
          `Request failed with status ${response.status}`,
          response.status,
          parsedBody,
          retryable
        );
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return (await response.json()) as T;
      }

      return (await response.text()) as unknown as T;
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof ApiError ? error.retryable : error instanceof Error;
      if (attempt === maxRetries || !retryable) {
        if (logger) {
          logger.error({ error }, 'API request failed');
        }
        throw error;
      }
      const delayMs = baseDelayMs * 2 ** attempt;
      if (logger) {
        logger.warn({ attempt: attempt + 1, delayMs, error }, 'Retrying API request');
      }
      await delay(delayMs);
      attempt += 1;
    }
  }

  throw lastError ?? new Error('Unknown API error');
};
