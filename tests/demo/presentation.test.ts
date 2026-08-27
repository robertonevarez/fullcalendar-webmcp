import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AgentActivity } from '@/components/demo/agent-activity';
import { BusinessWebsite } from '@/components/demo/business-website';
import { getDefaultPreset } from '@/demo/presets';
import type { DemoActivityStep } from '@/demo/types';

const config = getDefaultPreset().config;

describe('demo presentation surfaces', () => {
  it('renders storefront from demo configuration without Protocol Tooling copy', () => {
    const html = renderToStaticMarkup(
      createElement(BusinessWebsite, {
        config,
        lastBooking: null,
        businessNotice: null,
      }),
    );

    expect(html).toMatch(/Acme Heating (&|\&amp;) Air/);
    expect(html).toContain('AC Diagnostic Visit');
    expect(html).toContain('$89');
    expect(html).toContain('Preventive Maintenance');
    expect(html).toContain('Home');
    expect(html).toContain('Services');
    expect(html).toContain('Serving Austin, TX');
    expect(html).not.toContain('Compatible agents');
    expect(html).not.toContain('structured capabilities exposed underneath');
    expect(html).not.toContain('Protocol Tooling');
    expect(html).not.toContain('Waiting for a request');
  });

  it('shows appointment consequence on the storefront after booking', () => {
    const html = renderToStaticMarkup(
      createElement(BusinessWebsite, {
        config,
        lastBooking: null,
        businessNotice: {
          headline: 'Appointment received',
          service_name: 'AC Diagnostic Visit',
          when_label: 'Tomorrow at 4:30 PM',
          notification_email: 'hello@acme.example',
          provider_name: 'James',
        },
      }),
    );

    expect(html).toContain('Appointment received');
    expect(html).toContain('AC Diagnostic Visit');
    expect(html).toContain('Tomorrow at 4:30 PM');
    expect(html).toContain('Notification would be sent to hello@acme.example');
  });

  it('starts Agent activity in a waiting state', () => {
    const html = renderToStaticMarkup(
      createElement(AgentActivity, {
        steps: [],
        activeStepId: null,
      }),
    );

    expect(html).toContain('Agent activity');
    expect(html).toContain('Waiting for a request');
    expect(html).not.toContain('search_services');
    expect(html).not.toContain('get_availability');
  });

  it('renders progressive real orchestration steps in Agent activity', () => {
    const steps: DemoActivityStep[] = [
      {
        id: 'search_services',
        label: 'Search services',
        tool: 'search_services',
        target: 'services',
        detail: 'AC Diagnostic Visit',
        result: {
          service_name: 'AC Diagnostic Visit',
          price_label: '$89',
          duration_minutes: 90,
        },
      },
      {
        id: 'check_service_area',
        label: 'Check service area',
        tool: 'check_service_area',
        target: 'service_area',
        detail: '78701 eligible',
        result: { postal_code: '78701', eligible: true },
      },
      {
        id: 'get_availability',
        label: 'Find availability',
        tool: 'get_availability',
        target: 'availability',
        detail: '3 times found',
        result: { slot_labels: ['4:00 PM', '4:15 PM', '4:30 PM'] },
      },
    ];

    const html = renderToStaticMarkup(
      createElement(AgentActivity, {
        steps,
        activeStepId: 'get_availability',
      }),
    );

    expect(html).toContain('Search services');
    expect(html).toContain('search_services');
    expect(html).toContain('AC Diagnostic Visit');
    expect(html).toContain('$89');
    expect(html).toContain('Check service area');
    expect(html).toContain('78701 eligible');
    expect(html).toContain('Find availability');
    expect(html).toContain('4:00 PM');
    expect(html).toContain('4:15 PM');
    expect(html).toContain('4:30 PM');
    expect(html).not.toContain('create_appointment');
  });

  it('renders outside-area failure without inventing availability', () => {
    const steps: DemoActivityStep[] = [
      {
        id: 'search_services',
        label: 'Search services',
        tool: 'search_services',
        target: 'services',
        result: {
          service_name: 'AC Diagnostic Visit',
          price_label: '$89',
          duration_minutes: 90,
        },
      },
      {
        id: 'check_service_area',
        label: 'Check service area',
        tool: 'check_service_area',
        target: 'service_area',
        detail: '90210 is outside the service area',
        result: { postal_code: '90210', eligible: false },
      },
    ];

    const html = renderToStaticMarkup(
      createElement(AgentActivity, {
        steps,
        activeStepId: 'check_service_area',
      }),
    );

    expect(html).toContain('90210 is outside the service area');
    expect(html).not.toContain('Find availability');
    expect(html).not.toContain('4:00 PM');
  });

  it('renders create-appointment confirmation in the trace', () => {
    const steps: DemoActivityStep[] = [
      {
        id: 'create_appointment',
        label: 'Create appointment',
        tool: 'create_appointment',
        target: 'booking',
        detail: 'Confirmed',
        result: {
          service_name: 'AC Diagnostic Visit',
          when_label: 'Tomorrow at 4:30 PM',
          provider_name: 'James',
        },
      },
    ];

    const html = renderToStaticMarkup(
      createElement(AgentActivity, {
        steps,
        activeStepId: 'create_appointment',
      }),
    );

    expect(html).toContain('Create appointment');
    expect(html).toContain('create_appointment');
    expect(html).toContain('Confirmed');
    expect(html).toContain('Tomorrow at 4:30 PM');
  });
});
