import { describe, expect, it } from 'vitest';
import { createBusinessTools, WEBMCP_TOOL_NAMES } from '@/webmcp/tools';

describe('WebMCP contract', () => {
  it('registers expected tool names and schemas', () => {
    const tools = createBusinessTools('acme-hvac', 'Acme Heating & Air');
    expect(tools.map((tool) => tool.name)).toEqual([...WEBMCP_TOOL_NAMES]);

    const readTools = [
      'search_services',
      'get_service_details',
      'check_service_area',
      'get_availability',
      'get_appointment',
    ];
    for (const name of readTools) {
      const tool = tools.find((item) => item.name === name)!;
      expect(tool.annotations?.readOnlyHint).toBe(true);
      expect(tool.description.length).toBeGreaterThan(10);
      expect(tool.inputSchema).toBeTruthy();
    }

    const writeTools = ['create_appointment', 'reschedule_appointment', 'cancel_appointment'];
    for (const name of writeTools) {
      const tool = tools.find((item) => item.name === name)!;
      expect(tool.annotations?.readOnlyHint).toBe(false);
    }

    const create = tools.find((tool) => tool.name === 'create_appointment')!;
    expect(create.inputSchema.required).toContain('idempotency_key');
    expect(create.inputSchema.required).toContain('slot_id');
  });
});
