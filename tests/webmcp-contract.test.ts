import { describe, expect, it } from 'vitest';
import { createBusinessTools, WEBMCP_TOOL_NAMES } from '@/webmcp/tools';

describe('WebMCP contract', () => {
  it('registers expected tool names and schemas', () => {
    const tools = createBusinessTools('marias-cleaning', "Maria's Cleaning Service");
    expect(tools.map((tool) => tool.name)).toEqual([...WEBMCP_TOOL_NAMES]);

    const readTools = [
      'get_business_info',
      'get_services',
      'check_service_eligibility',
      'check_availability',
      'get_appointment',
    ];
    for (const name of readTools) {
      const tool = tools.find((item) => item.name === name)!;
      expect(tool).toBeDefined();
      expect(tool.annotations?.readOnlyHint).toBe(true);
      expect(tool.description.length).toBeGreaterThan(10);
      expect(tool.inputSchema).toBeTruthy();
    }

    const writeTools = ['request_appointment', 'reschedule_appointment', 'cancel_appointment'];
    for (const name of writeTools) {
      const tool = tools.find((item) => item.name === name)!;
      expect(tool).toBeDefined();
      expect(tool.annotations?.readOnlyHint).toBe(false);
    }

    const requestAppt = tools.find((tool) => tool.name === 'request_appointment')!;
    expect(requestAppt.inputSchema.required).toContain('idempotency_key');
    expect(requestAppt.inputSchema.required).toContain('service_id');
    expect(requestAppt.inputSchema.required).toContain('customer');

    const getAppointment = tools.find((tool) => tool.name === 'get_appointment')!;
    expect(typeof getAppointment.execute).toBe('function');

    const checkEligibility = tools.find((tool) => tool.name === 'check_service_eligibility')!;
    expect(checkEligibility.description).toMatch(/eligibility/i);

    const availability = tools.find((tool) => tool.name === 'check_availability')!;
    expect(availability.description).toMatch(/availability/i);
    expect(availability.inputSchema.required).toEqual(['service_id', 'date_from', 'date_to']);
  });
});
