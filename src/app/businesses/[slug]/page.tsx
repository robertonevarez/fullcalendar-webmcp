import Link from 'next/link';
import { notFound } from 'next/navigation';
import { WebMCPStatus } from '@/components/WebMCPStatus';
import { ensureDatabaseSeeded } from '@/db/init';
import { bookingRepository } from '@/db/repository';

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  ensureDatabaseSeeded();
  const { slug } = await params;
  const business = bookingRepository.getBusinessBySlug(slug);
  if (!business) notFound();

  const services = bookingRepository.listServices(business.id);
  const resources = bookingRepository.listResources(business.id);

  return (
    <main style={{ maxWidth: 860, margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <p>
        <Link href="/">← All businesses</Link>
      </p>
      <h1>{business.name}</h1>
      <p>
        Timezone: <code>{business.timezone}</code> · Location mode:{' '}
        <code>{business.location_mode}</code>
      </p>
      <p>
        Agent surface URL: <code>/businesses/{business.slug}</code>
      </p>

      <h2>Services</h2>
      <ul>
        {services.map((service) => (
          <li key={service.id}>
            <strong>{service.name}</strong> ({service.duration_minutes} min) —{' '}
            <code>{service.id}</code>
          </li>
        ))}
      </ul>

      <h2>Resources</h2>
      <ul>
        {resources.map((resource) => (
          <li key={resource.id}>
            {resource.name} — <code>{resource.resource_type}</code>
          </li>
        ))}
      </ul>

      <WebMCPStatus businessSlug={business.slug} businessName={business.name} />
    </main>
  );
}
