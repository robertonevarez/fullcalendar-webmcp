import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerBusinessToolsWhenReady, registerPingTool, waitForModelContext } from '@/webmcp/lifecycle';
import { getModelContext, isWebMCPSupported, registerBusinessTools, WEBMCP_TOOL_NAMES } from '@/webmcp/tools';

function installModelContext(options?: {
  delayMs?: number;
  failTools?: string[];
  registerTool?: (tool: { name: string }, opts: { signal: AbortSignal }) => Promise<void>;
}) {
  const registrations: string[] = [];
  const registerTool =
    options?.registerTool ??
    (async (tool: { name: string }) => {
      if (options?.delayMs) await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      if (options?.failTools?.includes(tool.name)) {
        throw new DOMException('InvalidStateError', 'InvalidStateError');
      }
      registrations.push(tool.name);
    });

  const modelContext = { registerTool };
  vi.stubGlobal('document', { modelContext } as Document);
  vi.stubGlobal('navigator', {} as Navigator);
  return registrations;
}

describe('WebMCP registration lifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('detects WebMCP support via document.modelContext.registerTool', () => {
    installModelContext();
    expect(isWebMCPSupported()).toBe(true);
    expect(getModelContext()?.registerTool).toBeTypeOf('function');
  });

  it('reports unsupported when modelContext is absent', async () => {
    vi.stubGlobal('document', {} as Document);
    vi.stubGlobal('navigator', {} as Navigator);

    const result = await registerBusinessTools('acme-hvac', 'Acme Heating & Air', new AbortController().signal);
    expect(result.supported).toBe(false);
    expect(result.attempted).toBe(false);
    expect(result.registered).toEqual([]);
  });

  it('registers all expected business tools', async () => {
    const registrations = installModelContext();
    const result = await registerBusinessTools('acme-hvac', 'Acme Heating & Air', new AbortController().signal);

    expect(result.supported).toBe(true);
    expect(result.attempted).toBe(true);
    expect(result.registered).toEqual([...WEBMCP_TOOL_NAMES]);
    expect(registrations).toEqual([...WEBMCP_TOOL_NAMES]);
    expect(result.errors).toEqual([]);
  });

  it('continues registering when one tool fails and reports the error', async () => {
    installModelContext({ failTools: ['get_availability'] });
    const result = await registerBusinessTools('acme-hvac', 'Acme Heating & Air', new AbortController().signal);

    expect(result.registered).toEqual(WEBMCP_TOOL_NAMES.filter((name) => name !== 'get_availability'));
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.tool).toBe('get_availability');
  });

  it('polls until modelContext appears', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('document', {} as Document);
    vi.stubGlobal('navigator', {} as Navigator);

    const promise = waitForModelContext({ timeoutMs: 2000, intervalMs: 100 });
    await vi.advanceTimersByTimeAsync(250);
    vi.stubGlobal('document', { modelContext: { registerTool: vi.fn() } } as Document);

    await vi.advanceTimersByTimeAsync(100);
    const modelContext = await promise;
    expect(modelContext?.registerTool).toBeTypeOf('function');

    vi.useRealTimers();
  });

  it('registers business tools after delayed modelContext injection', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('document', {} as Document);
    vi.stubGlobal('navigator', {} as Navigator);

    const registrations: string[] = [];
    const controller = new AbortController();
    const promise = registerBusinessToolsWhenReady('acme-hvac', 'Acme Heating & Air', controller.signal, {
      timeoutMs: 3000,
      intervalMs: 100,
    });

    await vi.advanceTimersByTimeAsync(250);
    vi.stubGlobal(
      'document',
      {
        modelContext: {
          registerTool: async (tool: { name: string }) => {
            registrations.push(tool.name);
          },
        },
      } as Document,
    );

    await vi.advanceTimersByTimeAsync(150);
    const state = await promise;

    expect(state.phase).toBe('registered');
    if (state.phase === 'registered') {
      expect(state.registered).toEqual([...WEBMCP_TOOL_NAMES]);
    }
    expect(registrations).toEqual([...WEBMCP_TOOL_NAMES]);

    vi.useRealTimers();
  });

  it('registers ping diagnostic tool read-only', async () => {
    const registrations = installModelContext();
    const result = await registerPingTool(new AbortController().signal);

    expect(result.registered).toEqual(['ping']);
    expect(registrations).toEqual(['ping']);
    expect(result.errors).toEqual([]);
  });

  it('aborts registration cleanup without throwing', async () => {
    installModelContext();
    const controller = new AbortController();
    const pending = registerBusinessTools('acme-hvac', 'Acme Heating & Air', controller.signal);
    controller.abort();
    const result = await pending;
    expect(result.attempted).toBe(true);
  });
});
