import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(join(root, 'src/app/businesses/[slug]/page.tsx'), 'utf8');
const overview = readFileSync(join(root, 'src/components/business-product-overview.tsx'), 'utf8');

describe('business product overview page', () => {
  it('renders the authoritative business identity fields and WebMCP registration provider', () => {
    expect(page).toContain('<WebMCPBusinessProvider businessSlug={business.slug} businessName={business.name}>');
    expect(page).toContain('BusinessProductOverview');
    expect(overview).toContain('{business.name}');
    expect(overview).toContain('{business.address.city}, {business.address.region}');
    expect(overview).toContain('{business.description}');
  });

  it('provides shadcn Tabs, Cards, Badges, and Buttons for Services, Reviews, FAQ, and WebMCP', () => {
    expect(overview).toContain('<Tabs');
    expect(overview).toContain('<TabsList');
    expect(overview).toContain('<TabsTrigger');
    expect(overview).toContain('<TabsContent');
    expect(overview).toContain('<Button');
    expect(overview).toContain('<Badge');
    expect(overview).toContain('<Card');
    expect(overview).toContain('<Separator');
    expect(overview).toContain('Services &amp; Pricing');
    expect(overview).toContain('Customer Reviews');
    expect(overview).toContain('FAQ');
    expect(overview).toContain('WebMCP Live Tools');
  });

  it('exposes live WebMCP registration state and tools diagnostics', () => {
    expect(overview).toContain('WEBMCP_TOOL_NAMES');
    expect(overview).toContain('useWebMCPRegistrationState');
    expect(overview).toContain('registrationState.phase');
  });
});

