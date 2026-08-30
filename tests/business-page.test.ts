import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(join(root, 'src/app/businesses/[slug]/page.tsx'), 'utf8');
const overview = readFileSync(join(root, 'src/components/business-product-overview.tsx'), 'utf8');
const actions = readFileSync(join(root, 'src/components/business-agent-actions.tsx'), 'utf8');
const chatGuide = readFileSync(join(root, 'src/components/chatgpt-booking-guide.tsx'), 'utf8');
const demo = readFileSync(join(root, 'src/components/ai-booking-demo.tsx'), 'utf8');
const inspect = readFileSync(join(root, 'src/components/webmcp-inspect-panel.tsx'), 'utf8');
const inlinePanel = readFileSync(join(root, 'src/components/inline-page-panel.tsx'), 'utf8');

describe('business product overview page', () => {
  it('renders the authoritative business identity fields and WebMCP registration provider', () => {
    expect(page).toContain('<WebMCPBusinessProvider businessSlug={business.slug} businessName={business.name}>');
    expect(page).toContain('BusinessProductOverview');
    expect(overview).toContain('{business.name}');
    expect(overview).toContain('{business.address.city}, {business.address.region}');
    expect(overview).toContain('{business.description}');
  });

  it('exposes dual agent/human CTAs as full-page inline views without Dialog', () => {
    expect(overview).toContain('BusinessAgentActions');
    expect(overview).toContain('activeView');
    expect(overview).toContain('useWebMCPRegistrationState');
    expect(actions).toContain('Book with ChatGPT');
    expect(actions).toContain('See how AI booking works');
    expect(actions).toContain('Inspect tooling');
    expect(actions).toContain('onSelectView');
    expect(inlinePanel).toContain('Back');
    expect(chatGuide).toContain('InlinePagePanel');
    expect(demo).toContain('InlinePagePanel');
    expect(inspect).toContain('InlinePagePanel');
    expect(chatGuide).not.toContain('Dialog');
    expect(demo).not.toContain('Dialog');
    expect(inspect).not.toContain('Dialog');
    expect(demo).toMatch(/Nothing is\s+booked/);
    expect(chatGuide).toContain('does not send a message');
  });

  it('keeps ChatGPT guidance tied to registration state and real business prompts', () => {
    expect(chatGuide).toContain('bookingGuideMode');
    expect(chatGuide).toContain('buildSuggestedBookingRequest');
    expect(chatGuide).toContain('Copy request');
    expect(chatGuide).toContain('Copy page link');
    expect(demo).toContain('buildBookingDemoScenario');
    expect(inspect).toContain('WEBMCP_TOOL_NAMES');
    expect(inspect).toContain('registrationState.phase');
  });
});
