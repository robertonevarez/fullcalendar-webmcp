import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AgentActivity } from '@/components/demo/agent-activity';
import { BusinessWebsite } from '@/components/demo/business-website';
import { DEMO_PRESETS, getDefaultPreset } from '@/demo/presets';
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
    expect(html).toContain('Services');
    expect(html).toContain('Austin Heating &amp; Cooling Service');
    expect(html).toContain('Need your AC fixed???');
    expect(html).toContain('Comic_Sans_MS');
    expect(html).toContain('Austin, TX');
    expect(html).toContain('78701 · 78702 · 78703');
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
    expect(html).toContain('Details would be sent to hello@acme.example');
  });

  it.each(DEMO_PRESETS)('composes an intentional $id storefront from its archetype', (preset) => {
    const html = renderToStaticMarkup(
      createElement(BusinessWebsite, {
        config: preset.config,
        lastBooking: null,
        businessNotice: null,
      }),
    );

    expect(html).toContain(preset.config.businessName.replaceAll('&', '&amp;'));
    for (const service of preset.config.services) {
      expect(html).toContain(service.name);
      expect(html).toContain(`$${service.price_dollars}`);
      expect(html).toContain(String(service.duration_minutes));
    }

    if (preset.config.archetype === 'field_service') {
      expect(html).toContain('Austin Heating &amp; Cooling Service');
      expect(html).toContain('Need your AC fixed???');
    } else if (preset.config.archetype === 'salon') {
      expect(html).toContain('Beautiful hair starts here');
      expect(html).toContain('Our stylists');
      expect(html).not.toContain('Austin Heating &amp; Cooling Service');
    } else {
      expect(html).toContain('Straightforward service for your car.');
      expect(html).toContain('Technicians');
      expect(html).not.toContain('Beautiful hair starts here');
    }

    expect(html).not.toContain('Protocol Tooling');
    expect(html.match(/data-demo-target="storefront"/g)).toHaveLength(1);
    expect(html).toMatch(/href="#(?:services|contact|visit)"/);
  });

  it('does not carry storefront content across business configurations', () => {
    const htmlFor = (presetId: (typeof DEMO_PRESETS)[number]['id']) =>
      renderToStaticMarkup(
        createElement(BusinessWebsite, {
          config: DEMO_PRESETS.find((preset) => preset.id === presetId)!.config,
          lastBooking: null,
          businessNotice: null,
        }),
      );
    const acme = htmlFor('acme-hvac');
    const salon = htmlFor('northline-salon');
    const auto = htmlFor('mesa-auto');

    expect(salon).not.toContain('AC Diagnostic Visit');
    expect(salon).not.toContain('Straightforward service for your car.');
    expect(auto).not.toContain('Beautiful hair starts here');
    expect(auto).not.toContain('AC Diagnostic Visit');
    expect(acme).not.toContain('Beautiful hair starts here');
    expect(acme).not.toContain('Straightforward service for your car.');
  });

  it('keeps human CTAs separate from agent cursor targets', () => {
    const html = renderToStaticMarkup(
      createElement(BusinessWebsite, {
        config,
        lastBooking: null,
        businessNotice: null,
      }),
    );

    expect(html).toContain('SCHEDULE SERVICE');
    expect(html).toContain('href="#services"');
    expect(html).not.toMatch(/<a\s[^>]+data-demo-target=/);
    expect(html).not.toContain('data-demo-target="schedule-service"');
    expect(html).not.toContain('data-demo-target="book-an-appointment"');
  });

  it('starts Agent activity in a waiting state', () => {
    const html = renderToStaticMarkup(
      createElement(AgentActivity, {
        steps: [],
        activeStepId: null,
      }),
    );

    expect(html).toContain('Agent activity');
    expect(html).toContain('protocol-tooling://agent');
    expect(html).toContain('waiting for agent request...');
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
          service_id: 'demo_svc_ac_diagnostic',
          query: 'AC cooling upstairs',
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
        result: { query: 'after 4 pm', slot_labels: ['4:00 PM', '4:15 PM', '4:30 PM'] },
      },
    ];

    const html = renderToStaticMarkup(
      createElement(AgentActivity, {
        steps,
        activeStepId: 'get_availability',
      }),
    );

    expect(html).toContain('search_services');
    expect(html).toContain('query: &quot;AC cooling upstairs&quot;');
    expect(html).toContain('demo_svc_ac_diagnostic');
    expect(html).toContain('AC Diagnostic Visit');
    expect(html).toContain('$89');
    expect(html).toContain('postal_code: 78701');
    expect(html).toContain('eligible');
    expect(html).toContain('3 slots');
    expect(html).toContain('after: &quot;after 4 pm&quot;');
    expect(html).toContain('4:00 PM');
    expect(html).toContain('4:15 PM');
    expect(html).toContain('4:30 PM');
    expect(html).not.toContain('create_appointment');
    expect(html).not.toContain('Search services');
    expect(html).toContain('&gt;</span>search_services');
    expect(html.indexOf('&gt;</span>search_services')).toBeLessThan(html.indexOf('AC Diagnostic Visit'));
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

    expect(html).toContain('postal_code: 90210');
    expect(html).toContain('outside_service_area');
    expect(html).not.toContain('get_availability');
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
          service_id: 'demo_svc_ac_diagnostic',
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

    expect(html).toContain('create_appointment');
    expect(html).toContain('service: demo_svc_ac_diagnostic');
    expect(html).toContain('confirmed');
    expect(html).toContain('Tomorrow at 4:30 PM');
  });
});
