import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(join(root, 'src/app/businesses/[slug]/page.tsx'), 'utf8');

describe('business identity page', () => {
  it('renders the authoritative identity fields while retaining WebMCP registration', () => {
    expect(page).toContain('<WebMCPBusinessProvider businessSlug={business.slug} businessName={business.name}>');
    expect(page).toContain('{business.name}');
    expect(page).toContain('{business.address.city}, {business.address.region}');
    expect(page).toContain('{business.description}');
  });

  it('does not render the former service catalog or diagnostics UI', () => {
    expect(page).not.toContain('listServices');
    expect(page).not.toContain('listServiceAreaZones');
    expect(page).not.toContain('WebMCPStatus');
    expect(page).not.toContain('Services &amp; Offerings');
  });
});
