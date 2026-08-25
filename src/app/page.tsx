import Link from 'next/link';
import { ensureDatabaseSeeded } from '@/db/init';
import { bookingRepository } from '@/db/repository';

export default function HomePage() {
  ensureDatabaseSeeded();
  const businesses = bookingRepository.listBusinesses();

  return (
    <main style={{ maxWidth: 860, margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>ScheduleMCP</h1>
      <p>
        Agent-native scheduling infrastructure for service businesses. Each business page registers
        WebMCP tools scoped to that business context.
      </p>
      <h2>Seeded businesses</h2>
      <ul>
        {businesses.map((business) => (
          <li key={business.id}>
            <Link href={`/businesses/${business.slug}`}>{business.name}</Link>
            <span style={{ color: '#666' }}> — {business.location_mode.replace('_', ' ').toLowerCase()}</span>
          </li>
        ))}
      </ul>
      <p>
        Open a business page in ChatGPT&apos;s in-app browser or Chrome with WebMCP enabled to invoke
        tools directly from a personal agent.
      </p>
    </main>
  );
}
