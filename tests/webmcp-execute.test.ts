import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBusinessTools, postJson } from '@/webmcp/tools';

describe('WebMCP execute wrapper', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does not throw when execute is invoked with only input (Chrome executeTool shape)', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ ok: true, data: { services: [{ service_id: 'svc_ac_diagnostic' }] } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const tools = createBusinessTools('acme-hvac', 'Acme Heating & Air');
    const search = tools.find((tool) => tool.name === 'search_services')!;

    // Chrome 152 executeTool currently calls execute(input) with argc === 1.
    await expect(search.execute({ query: 'AC maintenance' })).resolves.toEqual({
      ok: true,
      data: { services: [{ service_id: 'svc_ac_diagnostic' }] },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/businesses/acme-hvac/search-services',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ query: 'AC maintenance' }),
      }),
    );
  });

  it('forwards AbortSignal when options.signal is provided', async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    const tools = createBusinessTools('acme-hvac', 'Acme Heating & Air');
    const search = tools.find((tool) => tool.name === 'search_services')!;
    const controller = new AbortController();

    await search.execute({ query: 'AC' }, { signal: controller.signal });

    expect(fetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('accepts execute(input, undefined) without destructuring errors', async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: { status: 'eligible' } }));
    vi.stubGlobal('fetch', fetchMock);

    const tools = createBusinessTools('acme-hvac', 'Acme Heating & Air');
    const check = tools.find((tool) => tool.name === 'check_service_area')!;

    await expect(check.execute({ postal_code: '78701' }, undefined)).resolves.toMatchObject({
      ok: true,
    });
  });

  it('returns structured error when response body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('not-json', { status: 500, headers: { 'Content-Type': 'text/plain' } })),
    );

    await expect(postJson('/api/businesses/acme-hvac/search-services', { query: 'AC' })).resolves.toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Tool HTTP response was not JSON (status 500).',
        retryable: true,
      },
    });
  });
});
