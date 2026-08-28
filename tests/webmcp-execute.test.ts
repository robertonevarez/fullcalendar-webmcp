import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBusinessTools, isStructuredDomainError, postJson, ToolExecuteOptions } from '@/webmcp/tools';

type ToolExecute = (input: Record<string, unknown>, options?: ToolExecuteOptions) => Promise<unknown>;

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
    const execute = search.execute as ToolExecute;

    // Chrome 152 executeTool currently calls execute(input) with argc === 1.
    await expect(execute({ query: 'AC maintenance' })).resolves.toEqual({
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

  it('routes to explicit apiBaseUrl when configured', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ ok: true, data: { services: [{ service_id: 'svc_ac_diagnostic' }] } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const tools = createBusinessTools({
      businessSlug: 'acme-hvac',
      businessName: 'Acme Heating & Air',
      apiBaseUrl: 'https://api.protocoltooling.com',
    });
    const search = tools.find((tool) => tool.name === 'search_services')!;
    const execute = search.execute as ToolExecute;

    await execute({ query: 'AC' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.protocoltooling.com/api/businesses/acme-hvac/search-services',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ query: 'AC' }),
      }),
    );
  });

  it('forwards AbortSignal when options.signal is provided', async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    const tools = createBusinessTools('acme-hvac', 'Acme Heating & Air');
    const search = tools.find((tool) => tool.name === 'search_services')!;
    const execute = search.execute as ToolExecute;
    const controller = new AbortController();

    await execute({ query: 'AC' }, { signal: controller.signal });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init).toEqual(expect.objectContaining({ signal: controller.signal }));
  });

  it('accepts execute(input, undefined) without destructuring errors', async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: { status: 'eligible' } }));
    vi.stubGlobal('fetch', fetchMock);

    const tools = createBusinessTools('acme-hvac', 'Acme Heating & Air');
    const check = tools.find((tool) => tool.name === 'check_service_area')!;
    const execute = check.execute as ToolExecute;

    await expect(execute({ postal_code: '78701' }, undefined)).resolves.toMatchObject({
      ok: true,
    });
  });

  it('does not console.error expected structured domain rejections', async () => {
    const domainError = {
      ok: false,
      error: {
        code: 'OUTSIDE_SERVICE_AREA',
        message: 'Postal code 90210 is outside the service area.',
        retryable: false,
        field: 'postal_code',
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(domainError, { status: 400 })),
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      postJson('/api/businesses/acme-hvac/check-service-area', { postal_code: '90210' }),
    ).resolves.toEqual(domainError);

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('console.errors unexpected non-JSON or non-domain HTTP failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('not-json', { status: 500, headers: { 'Content-Type': 'text/plain' } })),
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(postJson('/api/businesses/acme-hvac/search-services', { query: 'AC' })).resolves.toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Tool HTTP response was not JSON (status 500).',
        retryable: true,
      },
    });

    expect(errorSpy).toHaveBeenCalled();
  });

  it('console.errors network failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(postJson('/api/businesses/acme-hvac/search-services', { query: 'AC' })).resolves.toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR' },
    });

    expect(errorSpy).toHaveBeenCalled();
  });

  it('returns structured error when response body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('not-json', { status: 500, headers: { 'Content-Type': 'text/plain' } })),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(postJson('/api/businesses/acme-hvac/search-services', { query: 'AC' })).resolves.toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Tool HTTP response was not JSON (status 500).',
        retryable: true,
      },
    });
  });

  it('recognizes structured domain error payloads', () => {
    expect(
      isStructuredDomainError({
        ok: false,
        error: { code: 'OUTSIDE_SERVICE_AREA', message: 'out', retryable: false },
      }),
    ).toBe(true);
    expect(isStructuredDomainError({ ok: true, data: {} })).toBe(false);
    expect(isStructuredDomainError({ status: 500 })).toBe(false);
  });
});
