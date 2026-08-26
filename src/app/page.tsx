import Link from 'next/link';
import { ensureDatabaseSeeded } from '@/db/init';
import { bookingRepository } from '@/db/repository';
import { BUSINESS_ARCHETYPES } from '@/lib/demo-prompts';

const GITHUB_URL = 'https://github.com/robertonevarez/protocoltooling';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  await ensureDatabaseSeeded();
  const businesses = await bookingRepository.listBusinesses();

  return (
    <main>
      <section className="page-intro" aria-labelledby="intro-heading">
        <h1 id="intro-heading">Protocol Tooling</h1>
        <p className="tagline">Your customers have agents. Let them book you.</p>
        <p className="lead">
          Protocol Tooling lets websites expose services, availability, and appointment actions
          directly to AI agents through WebMCP.
        </p>
        <div className="cta-row">
          <Link className="button button-primary" href="/businesses/acme-hvac">
            Try the demo
          </Link>
          <Link className="button" href="/docs">
            View documentation
          </Link>
        </div>
      </section>

      <section className="section" aria-labelledby="how-heading">
        <h2 id="how-heading">How it works</h2>
        <ol className="flow">
          <li>User intent</li>
          <li>Personal agent</li>
          <li>WebMCP</li>
          <li>Business scheduling</li>
          <li>Appointment</li>
        </ol>
      </section>

      <section className="section" aria-labelledby="example-heading">
        <h2 id="example-heading">Example</h2>
        <div className="example-prompt">
          {`"My AC isn't cooling upstairs.
I'm free tomorrow after 4.
I'm in 78701."`}
        </div>
        <ul className="tool-names">
          <li>
            <code>search_services</code>
          </li>
          <li>
            <code>check_service_area</code>
          </li>
          <li>
            <code>get_availability</code>
          </li>
          <li>
            <code>create_appointment</code>
          </li>
        </ul>
      </section>

      <section className="section" aria-labelledby="verticals-heading">
        <h2 id="verticals-heading">Works across service businesses</h2>
        <ul className="business-list">
          {businesses.map((business) => {
            const meta = BUSINESS_ARCHETYPES[business.slug];
            return (
              <li key={business.id}>
                <Link href={`/businesses/${business.slug}`}>{business.name}</Link>
                {meta ? ` — ${meta.label}` : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="section" aria-labelledby="webmcp-heading">
        <h2 id="webmcp-heading">Built with WebMCP</h2>
        <p className="section-lead">
          Each business page registers eight tools on <code>document.modelContext</code>. Agents
          discover capabilities at the URL they visit — no scraping, no form automation. The
          website explains the surface; the agent is the interface.
        </p>
        <p>
          <Link href="/docs">Documentation</Link>
          {' · '}
          <a href={GITHUB_URL}>GitHub</a>
        </p>
      </section>
    </main>
  );
}
