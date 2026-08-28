import { getModelContext, registerBusinessTools, registrationErrorMessage, type RegisterBusinessToolsOptions, type RegistrationResult } from '@/webmcp/tools';

export type WebMCPRegistrationState =
  | { phase: 'waiting'; supported: false; attempted: false }
  | { phase: 'registering'; supported: true; attempted: true }
  | ({ phase: 'registered' } & RegistrationResult)
  | ({ phase: 'failed' } & RegistrationResult);

export type WaitForModelContextOptions = {
  timeoutMs?: number;
  intervalMs?: number;
  signal?: AbortSignal;
};

export interface RegisterBusinessToolsWhenReadyOptions extends WaitForModelContextOptions {
  businessSlug: string;
  businessName: string;
  apiBaseUrl?: string;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_INTERVAL_MS = 100;

/**
 * Poll until document.modelContext.registerTool exists or timeout elapses.
 * ChatGPT's built-in browser may inject modelContext after initial paint.
 */
export async function waitForModelContext(
  options: WaitForModelContextOptions = {},
): Promise<{ registerTool?: Function } | undefined> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (options.signal?.aborted) return undefined;

    const modelContext = getModelContext();
    if (modelContext?.registerTool) return modelContext;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, intervalMs);
      options.signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(options.signal!.reason);
        },
        { once: true },
      );
    }).catch(() => undefined);
  }

  return getModelContext()?.registerTool ? getModelContext() : undefined;
}

export async function registerPingTool(signal: AbortSignal): Promise<RegistrationResult> {
  const modelContext = getModelContext();
  if (!modelContext?.registerTool) {
    return {
      supported: false,
      attempted: false,
      registered: [],
      errors: [],
      businessSlug: 'debug',
    };
  }

  try {
    await modelContext.registerTool(
      {
        name: 'ping',
        description: 'Health check for WebMCP discovery. Returns ok: true with no side effects.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: async () => ({ ok: true }),
      },
      { signal },
    );
    return {
      supported: true,
      attempted: true,
      registered: ['ping'],
      errors: [],
      businessSlug: 'debug',
    };
  } catch (error) {
    return {
      supported: true,
      attempted: true,
      registered: [],
      errors: [{ tool: 'ping', message: registrationErrorMessage(error) }],
      businessSlug: 'debug',
    };
  }
}

export async function registerBusinessToolsWhenReady(
  optionsOrSlug: RegisterBusinessToolsWhenReadyOptions | string,
  maybeBusinessName?: string,
  maybeSignal?: AbortSignal,
  maybeOptions: WaitForModelContextOptions = {},
): Promise<WebMCPRegistrationState> {
  const options: RegisterBusinessToolsWhenReadyOptions =
    typeof optionsOrSlug === 'string'
      ? {
          businessSlug: optionsOrSlug,
          businessName: maybeBusinessName ?? optionsOrSlug,
          signal: maybeSignal,
          ...maybeOptions,
        }
      : optionsOrSlug;

  const { businessSlug, businessName, apiBaseUrl, signal, timeoutMs, intervalMs } = options;
  const modelContext = await waitForModelContext({ timeoutMs, intervalMs, signal });
  if (!modelContext?.registerTool) {
    return {
      phase: 'failed',
      supported: false,
      attempted: false,
      registered: [],
      errors: [{ message: 'WebMCP modelContext.registerTool not available before timeout.' }],
      businessSlug,
    };
  }

  const result = await registerBusinessTools({
    businessSlug,
    businessName,
    apiBaseUrl,
    signal,
  });

  if (result.registered.length > 0 && result.errors.length === 0) {
    return { phase: 'registered', ...result };
  }

  if (result.registered.length > 0) {
    return { phase: 'registered', ...result };
  }

  return { phase: 'failed', ...result };
}

export function logRegistrationState(state: WebMCPRegistrationState) {
  if (process.env.NODE_ENV === 'production') return;

  const payload = {
    phase: state.phase,
    supported: 'supported' in state ? state.supported : false,
    attempted: 'attempted' in state ? state.attempted : false,
    registered: 'registered' in state ? state.registered : [],
    errors: 'errors' in state ? state.errors : [],
    businessSlug: 'businessSlug' in state ? state.businessSlug : undefined,
  };

  if (state.phase === 'registered') {
    console.info('[webmcp]', payload);
  } else if (state.phase === 'failed') {
    console.warn('[webmcp]', payload);
  }
}
