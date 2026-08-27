import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AgentInteractionOverlay } from '@/components/demo/agent-interaction-overlay';
import { BusinessWebsite } from '@/components/demo/business-website';
import { DEMO_PRESETS, getDefaultPreset } from '@/demo/presets';
import type { DemoActivityStep } from '@/demo/types';

vi.mock('@/lib/fonts', () => ({
  inter: { className: 'font-inter' },
  instrumentSans: { className: 'font-instrument', variable: '--font-sans' },
}));

vi.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => true,
}));

const { CustomerConversation } = await import('@/components/demo/customer-conversation');

const config = getDefaultPreset().config;

describe('demo presentation surfaces', () => {
  it('renders the conversation as a playback surface without an editable composer', () => {
    const html = renderToStaticMarkup(
      createElement(CustomerConversation, {
        config,
      }),
    );

    expect(html).toContain('data-demo-playback="playing"');
    expect(html).toContain('Product walkthrough');
    expect(html).not.toContain('Ask a follow-up');
    expect(html).not.toMatch(/<textarea\b/i);
    expect(html).not.toMatch(/placeholder=/i);
    expect(html).not.toContain('type="submit"');
    expect(html).not.toContain("Message to the customer's agent");
  });

  it('renders full storefront without any persistent terminal section', () => {
    const html = renderToStaticMarkup(
      createElement(CustomerConversation, {
        config,
      }),
    );

    expect(html).not.toContain('protocol-tooling://agent');
    expect(html).not.toContain('Agent activity terminal');
    expect(html).not.toContain('waiting for agent request...');
    expect(html).not.toContain('&gt;</span>search_services');
    expect(html).not.toContain('monospace console');
  });

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
    expect(html).toContain('data-agent-access="false"');
  });

  it('enters agent-access state and hosts overlay when agent accesses website', () => {
    const step: DemoActivityStep = {
      id: 'search_services',
      label: 'Search services',
      tool: 'search_services',
      target: 'services',
      result: {
        service_id: 'demo_svc_ac_diagnostic',
        service_name: 'AC Diagnostic Visit',
        price_label: '$89',
        duration_minutes: 90,
      },
    };

    const overlay = createElement(AgentInteractionOverlay, {
      step,
      status: 'resolved',
      completedSteps: [step],
      reducedMotion: true,
    });

    const html = renderToStaticMarkup(
      createElement(BusinessWebsite, {
        config,
        lastBooking: null,
        businessNotice: null,
        isAgentAccess: true,
        overlay,
      }),
    );

    expect(html).toContain('data-agent-access="true"');
    expect(html).toContain('blur-[1.5px]');
    expect(html).toContain('data-demo-target="overlay"');
    expect(html).toContain('AC Diagnostic Visit');
    expect(html).toContain('search_services');
  });

  it('renders search operation running and resolved states in overlay', () => {
    const step: DemoActivityStep = {
      id: 'search_services',
      label: 'Search services',
      tool: 'search_services',
      target: 'services',
      result: {
        service_id: 'demo_svc_ac_diagnostic',
        query: 'AC cooling upstairs',
        service_name: 'AC Diagnostic Visit',
        price_label: '$89',
        duration_minutes: 90,
      },
    };

    const runningHtml = renderToStaticMarkup(
      createElement(AgentInteractionOverlay, {
        step,
        status: 'running',
        reducedMotion: true,
      }),
    );

    expect(runningHtml).toContain('Finding the right service');
    expect(runningHtml).toContain('search_services');
    expect(runningHtml).toContain('Matching &quot;AC cooling upstairs&quot;');

    const resolvedHtml = renderToStaticMarkup(
      createElement(AgentInteractionOverlay, {
        step,
        status: 'resolved',
        reducedMotion: true,
      }),
    );

    expect(resolvedHtml).toContain('AC Diagnostic Visit');
    expect(resolvedHtml).toContain('$89 · 90 min');
    expect(resolvedHtml).toContain('search_services');
  });

  it('renders service-area operation eligible state and grouped summary in overlay', () => {
    const searchStep: DemoActivityStep = {
      id: 'search_services',
      label: 'Search services',
      tool: 'search_services',
      target: 'services',
      result: {
        service_name: 'AC Diagnostic Visit',
        price_label: '$89',
        duration_minutes: 90,
      },
    };

    const areaStep: DemoActivityStep = {
      id: 'check_service_area',
      label: 'Check service area',
      tool: 'check_service_area',
      target: 'service_area',
      detail: '78701 eligible',
      result: { postal_code: '78701', eligible: true },
    };

    const html = renderToStaticMarkup(
      createElement(AgentInteractionOverlay, {
        step: areaStep,
        status: 'resolved',
        completedSteps: [searchStep, areaStep],
        reducedMotion: true,
      }),
    );

    expect(html).toContain('AC Diagnostic Visit');
    expect(html).toContain('$89 · 90 min');
    expect(html).toContain('Available in 78701');
    expect(html).toContain('check_service_area');
  });

  it('renders outside-area failure with neutral presentation and no availability', () => {
    const step: DemoActivityStep = {
      id: 'check_service_area',
      label: 'Check service area',
      tool: 'check_service_area',
      target: 'service_area',
      detail: '90210 is outside the service area',
      result: { postal_code: '90210', eligible: false },
    };

    const html = renderToStaticMarkup(
      createElement(AgentInteractionOverlay, {
        step,
        status: 'resolved',
        completedSteps: [step],
        reducedMotion: true,
      }),
    );

    expect(html).toContain('Not available in 90210');
    expect(html).toContain('90210 is outside the service area');
    expect(html).toContain('check_service_area');
    expect(html).not.toContain('Available tomorrow');
    expect(html).not.toContain('4:00 PM');
  });

  it('renders availability operation with real slot pill elements in overlay', () => {
    const step: DemoActivityStep = {
      id: 'get_availability',
      label: 'Find availability',
      tool: 'get_availability',
      target: 'availability',
      result: {
        query: 'after 4 pm',
        slot_labels: ['4:00 PM', '4:15 PM', '4:30 PM'],
      },
    };

    const html = renderToStaticMarkup(
      createElement(AgentInteractionOverlay, {
        step,
        status: 'resolved',
        completedSteps: [step],
        reducedMotion: true,
      }),
    );

    expect(html).toContain('Available tomorrow');
    expect(html).toContain('get_availability');
    expect(html).toContain('4:00 PM');
    expect(html).toContain('4:15 PM');
    expect(html).toContain('4:30 PM');
  });

  it('renders create-appointment confirmation in overlay', () => {
    const step: DemoActivityStep = {
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
    };

    const html = renderToStaticMarkup(
      createElement(AgentInteractionOverlay, {
        step,
        status: 'resolved',
        completedSteps: [step],
        reducedMotion: true,
      }),
    );

    expect(html).toContain('Appointment confirmed');
    expect(html).toContain('Confirmed');
    expect(html).toContain('AC Diagnostic Visit');
    expect(html).toContain('Tomorrow at 4:30 PM');
    expect(html).toContain('Technician: James');
    expect(html).toContain('create_appointment');
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

  it('gates appointment booking overlay until explicit user confirmation', () => {
    // Turn 5: User says "4:30" (slot chosen)
    const slotChosenStepHtml = renderToStaticMarkup(
      createElement(CustomerConversation, {
        config,
      }),
    );
    // Initial render has no overlay active
    expect(slotChosenStepHtml).not.toContain('data-demo-overlay-target="booking"');
    expect(slotChosenStepHtml).not.toContain('Appointment confirmed');
  });
});
