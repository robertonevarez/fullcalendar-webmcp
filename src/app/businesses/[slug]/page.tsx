import { notFound } from 'next/navigation';
import { Page, Section } from '@/components/layout';
import { WebMCPBusinessProvider } from '@/components/webmcp-business-provider';
import { WebMCPStatus } from '@/components/webmcp-status';
import { ensureDatabaseSeeded } from '@/db/init';
import { bookingRepository } from '@/db/repository';
import { ClockIcon, MapPinIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatWorkingHours(hours: Array<{ day: number; open: string; close: string }>) {
  if (!hours || hours.length === 0) return 'By appointment';
  const minDay = Math.min(...hours.map((h) => h.day));
  const maxDay = Math.max(...hours.map((h) => h.day));
  const sample = hours[0];
  const dayRange = minDay === maxDay ? DAYS[minDay] : `${DAYS[minDay]}–${DAYS[maxDay]}`;
  return `${dayRange}, ${sample.open}–${sample.close}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await ensureDatabaseSeeded();
  const { slug } = await params;
  const business = await bookingRepository.getBusinessBySlug(slug);
  if (!business) return { title: 'Business Not Found' };
  return {
    title: `${business.name} — Protocol Tooling Endpoint`,
    description: `Agent-native capability surface for ${business.name} in ${business.address.city}, ${business.address.region} via native WebMCP.`,
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
  const zones = await bookingRepository.listServiceAreaZones(business.id);
  const postalCodes = Array.from(new Set(zones.flatMap((z) => z.postal_codes)));

  return (
    <WebMCPBusinessProvider businessSlug={business.slug} businessName={business.name}>
      <Page className="max-w-4xl py-8 space-y-10">
        {/* Business Identity Header */}
        <header className="space-y-3 border-b border-border pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Structured Business Endpoint
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              /businesses/{business.slug}
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {business.name}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPinIcon className="size-4" />
              <span>
                {business.address.city}, {business.address.region} ({business.address.postal_code})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ClockIcon className="size-4" />
              <span>
                {formatWorkingHours(business.working_hours)} ({business.timezone})
              </span>
            </div>
          </div>
        </header>

        {/* Machine-Readable Capability Info */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">Capability & Scheduling Specification</span>
            <span className="font-mono text-[11px] text-muted-foreground">{business.timezone}</span>
          </div>
          <p className="leading-relaxed">
            Exposes structured profile, services, territory validation, and deterministic availability. Accessible directly or via native browser WebMCP (<code className="font-mono text-[11px]">document.modelContext</code>).
          </p>
        </div>

        {/* Services Catalog */}
        <Section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Services &amp; Offerings
            </h2>
            <p className="text-sm text-muted-foreground">
              Authoritative service offerings exposed to agents via <code className="font-mono text-xs">get_services</code>.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-border bg-card p-5 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground">{s.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {s.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-mono">
                  <span className="text-foreground font-medium">
                    ${(s.price_cents / 100).toFixed(2)} {s.currency}
                  </span>
                  <span className="text-muted-foreground">
                    {s.duration_minutes} min
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Service Territory / Eligibility */}
        {postalCodes.length > 0 && (
          <Section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Service Area &amp; Eligibility
            </h2>
            <p className="text-sm text-muted-foreground">
              Validated automatically by <code className="font-mono text-xs">check_service_eligibility</code> before scheduling:
            </p>
            <div className="flex flex-wrap gap-2">
              {postalCodes.map((zip) => (
                <span
                  key={zip}
                  className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-mono text-foreground"
                >
                  ZIP {zip}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Developer Diagnostics (collapsible) */}
        <Section className="border-t border-border pt-6">
          <details className="group">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
              Developer diagnostics &amp; WebMCP runtime status
            </summary>
            <div className="mt-3">
              <WebMCPStatus businessSlug={business.slug} businessName={business.name} />
            </div>
          </details>
        </Section>
      </Page>
    </WebMCPBusinessProvider>
  );
}
