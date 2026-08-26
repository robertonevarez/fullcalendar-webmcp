import Link from 'next/link';
import { CopyPrompt } from '@/components/CopyPrompt';
import { ensureDatabaseSeeded } from '@/db/init';
import { bookingRepository } from '@/db/repository';
import { BUSINESS_ARCHETYPES, hvacNegativePrompt, hvacPositivePrompt } from '@/lib/demo-prompts';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  await ensureDatabaseSeeded();
  const businesses = await bookingRepository.listBusinesses();
  const positive = hvacPositivePrompt();
  const negative = hvacNegativePrompt();

  return (
    <main>
      <section className="hero" aria-labelledby="hero-brand">
        <p id="hero-brand" className="hero-brand">
          ScheduleMCP
        </p>
        <h1>Your customers have agents. Let them book you.</h1>
        <p className="hero-lead">
          ScheduleMCP exposes services, availability, and appointment actions directly to AI agents
          through WebMCP — so people express intent instead of navigating booking funnels.
        </p>
        <div className="cta-row">
          <Link className="button button-primary" href="/businesses/acme-hvac">
            Try the demo
          </Link>
          <Link className="button button-secondary" href="/docs">
            View WebMCP tools
          </Link>
        </div>
      </section>

      <section className="section" aria-labelledby="flow-heading">
        <h2 id="flow-heading">From intent to booked</h2>
        <p className="section-lead">
          The personal agent is the interface. ScheduleMCP is deterministic business truth.
        </p>
        <ol className="flow">
          <li>
            <span className="flow-step">Intent</span>
            <span>“I need someone to look at my AC tomorrow after 4.”</span>
          </li>
          <li>
            <span className="flow-step">Agent</span>
            <span>Chooses tools, asks for missing details, confirms with the human.</span>
          </li>
          <li>
            <span className="flow-step">WebMCP</span>
            <span>
              <code>search_services</code> → <code>check_service_area</code> →{' '}
              <code>get_availability</code> → <code>create_appointment</code>
            </span>
          </li>
          <li>
            <span className="flow-step">Engine</span>
            <span>Resources, hours, and service-area rules stay in the scheduling domain.</span>
          </li>
          <li>
            <span className="flow-step">Booked</span>
            <span>Confirmed appointment with reusable <code>appointment_id</code>.</span>
          </li>
        </ol>
      </section>

      <section className="section" aria-labelledby="contrast-heading">
        <h2 id="contrast-heading">Stop scraping booking forms</h2>
        <p className="section-lead">
          Agents should not reverse-engineer calendars and buttons when the business can expose
          capabilities.
        </p>
        <div className="contrast">
          <div className="contrast-col">
            <h3>Without WebMCP</h3>
            <ul>
              <li>Inspect UI</li>
              <li>Click Book</li>
              <li>Choose category / service</li>
              <li>Fill address</li>
              <li>Operate calendar</li>
              <li>Submit forms</li>
            </ul>
          </div>
          <div className="contrast-col good">
            <h3>With ScheduleMCP</h3>
            <ul>
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
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="demo-heading" id="demo">
        <h2 id="demo-heading">Try with an agent</h2>
        <p className="section-lead">
          Open{' '}
          <Link href="/businesses/acme-hvac">
            <code>/businesses/acme-hvac</code>
          </Link>{' '}
          in ChatGPT&apos;s in-app browser or Chrome with WebMCP enabled, then paste a prompt.
        </p>
        <h3 className="mono" style={{ fontSize: '0.85rem', letterSpacing: '0.06em' }}>
          POSITIVE PATH · 78701
        </h3>
        <CopyPrompt text={positive} />
        <h3 className="mono" style={{ fontSize: '0.85rem', letterSpacing: '0.06em' }}>
          NEGATIVE PATH · 90210
        </h3>
        <CopyPrompt text={negative} label="Copy negative prompt" />
      </section>

      <section className="section" aria-labelledby="verticals-heading">
        <h2 id="verticals-heading">Works across service businesses</h2>
        <p className="section-lead">
          One scheduler. Five archetypes. Differences are data — resources, capabilities, and
          service-area policy — not vertical-specific code paths.
        </p>
        <div className="business-grid">
          {businesses.map((business) => {
            const meta = BUSINESS_ARCHETYPES[business.slug];
            return (
              <article key={business.id} className="business-item">
                <h3>
                  <Link href={`/businesses/${business.slug}`}>{business.name}</Link>
                </h3>
                <p>
                  <strong>{meta?.label ?? business.location_mode}</strong>
                  {meta ? ` — ${meta.proves}` : null}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
