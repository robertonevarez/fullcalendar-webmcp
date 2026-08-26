import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CopyPrompt } from '@/components/CopyPrompt';
import { WebMCPBusinessProvider } from '@/components/WebMCPBusinessProvider';
import { WebMCPStatus } from '@/components/WebMCPStatus';
import { ensureDatabaseSeeded } from '@/db/init';
import { bookingRepository } from '@/db/repository';
import {
  BUSINESS_ARCHETYPES,
  hvacNegativePrompt,
  hvacPositivePrompt,
} from '@/lib/demo-prompts';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await ensureDatabaseSeeded();
  const { slug } = await params;
  const business = await bookingRepository.getBusinessBySlug(slug);
  if (!business) return { title: 'Business' };
  return {
    title: business.name,
    description: `Agent-bookable scheduling surface for ${business.name} via WebMCP.`,
  };
}

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await ensureDatabaseSeeded();
  const { slug } = await params;
  const business = await bookingRepository.getBusinessBySlug(slug);
  if (!business) notFound();

  const services = await bookingRepository.listServices(business.id);
  const resources = await bookingRepository.listResources(business.id);
  const archetype = BUSINESS_ARCHETYPES[business.slug];
  const isAcme = business.slug === 'acme-hvac';

  return (
    <WebMCPBusinessProvider businessSlug={business.slug} businessName={business.name}>
      <main>
        <section className="page-intro">
          <p>
            <Link href="/">← Home</Link>
          </p>
          <h1>{business.name}</h1>
          <p className="meta-line">
            {archetype?.label ?? business.location_mode.replaceAll('_', ' ')}
            {archetype ? ` — ${archetype.proves}` : null}
          </p>
          <p className="meta-line">Agent-ready via WebMCP</p>
          <p className="meta-line">
            Timezone <code>{business.timezone}</code> · Location mode{' '}
            <code>{business.location_mode}</code>
          </p>
          <p className="meta-line">
            This page registers WebMCP tools for <code>/businesses/{business.slug}</code>. There is
            no booking form — your agent is the interface.
          </p>
        </section>

        <section className="section" aria-labelledby="services-heading">
          <h2 id="services-heading">Services</h2>
          <ul className="item-list">
            {services.map((service) => (
              <li key={service.id}>
                <strong>{service.name}</strong> · {service.duration_minutes} min · $
                {(service.price_cents / 100).toFixed(0)} · <code>{service.id}</code>
                {service.service_area_required ? (
                  <span className="badge"> service area</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="section" aria-labelledby="resources-heading">
          <h2 id="resources-heading">Resources</h2>
          <p className="section-lead">Humans and physical assets share one allocation model.</p>
          <ul className="item-list">
            {resources.map((resource) => (
              <li key={resource.id}>
                {resource.name} — <code>{resource.resource_type}</code>
                {resource.capabilities.length
                  ? ` (${resource.capabilities.join(', ')})`
                  : null}
              </li>
            ))}
          </ul>
        </section>

        {isAcme ? (
          <section className="section" aria-labelledby="try-heading">
            <h2 id="try-heading">Example prompt</h2>
            <p className="section-lead">
              Paste into ChatGPT (in-app browser) or exercise tools in the Model Context Tool
              Inspector.
            </p>
            <CopyPrompt text={hvacPositivePrompt()} />
            <CopyPrompt text={hvacNegativePrompt()} label="Copy negative prompt" />
          </section>
        ) : null}

        <section className="diagnostics" aria-labelledby="diagnostics-heading">
          <h2 id="diagnostics-heading">Developer diagnostics</h2>
          <WebMCPStatus businessSlug={business.slug} businessName={business.name} />
        </section>
      </main>
    </WebMCPBusinessProvider>
  );
}
