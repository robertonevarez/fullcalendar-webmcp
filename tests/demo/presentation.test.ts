import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AgentInteractionOverlay } from '@/components/demo/agent-interaction-overlay';
import { BusinessWebsite } from '@/components/demo/business-website';
import { getDefaultPreset } from '@/demo/presets';
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
  it('renders the conversation as a playback surface without a composer or input area', () => {
    const html = renderToStaticMarkup(
      createElement(CustomerConversation, {
        config,
      }),
    );

    expect(html).toContain('data-demo-playback="playing"');
    expect(html).not.toContain('Ask a follow-up');
    expect(html).not.toMatch(/<textarea\b/i);
    expect(html).not.toMatch(/<input\b/i);
    expect(html).not.toMatch(/placeholder=/i);
    expect(html).not.toContain('type="submit"');
    expect(html).not.toContain("Message to the customer's agent");
  });

  it('renders full left surface without any persistent terminal section', () => {
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

  it('renders business surface container without mock website design or appointment notice text', () => {
    const html = renderToStaticMarkup(
      createElement(BusinessWebsite, {
        config,
        lastBooking: null,
        businessNotice: null,
      }),
    );

    expect(html).toContain('data-demo-target="storefront"');
    expect(html).toContain('data-agent-access="false"');
    expect(html).not.toContain('Comic_Sans_MS');
    expect(html).not.toContain('SCHEDULE SERVICE');
    expect(html).not.toContain('Need your AC fixed???');
    expect(html).not.toContain('Compatible agents');
    expect(html).not.toContain('Protocol Tooling');
    expect(html).not.toContain('Appointment received');
    expect(html).not.toContain('Details would be sent');
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

  it('gates appointment booking overlay until explicit user confirmation', () => {
    const slotChosenStepHtml = renderToStaticMarkup(
      createElement(CustomerConversation, {
        config,
      }),
    );
    expect(slotChosenStepHtml).not.toContain('data-demo-overlay-target="booking"');
    expect(slotChosenStepHtml).not.toContain('Appointment confirmed');
  });
});
