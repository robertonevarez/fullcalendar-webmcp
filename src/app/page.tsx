import Link from 'next/link';
import { ArrowRightIcon, ArrowUpRightIcon, CheckCircle2Icon, LayersIcon, ServerIcon, WrenchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WEBMCP_TOOL_NAMES } from '@/webmcp/tools';

const SEEDED_BUSINESSES = [
  {
    slug: 'acme-hvac',
    name: 'Acme Heating & Air',
    archetype: 'Field Service / HVAC',
    description: 'Service area validation (ZIP 78701 eligible, 90210 ineligible), dispatch constraints.',
  },
  {
    slug: 'blue-pipe-plumbing',
    name: 'Blue Pipe Plumbing',
    archetype: 'Field Service / Plumbing',
    description: 'Emergency and scheduled residential plumbing dispatch with zone constraints.',
  },
  {
    slug: 'northline-salon',
    name: 'Northline Salon',
    archetype: 'Personal Care / Stylist',
    description: 'Individual stylist scheduling without geographic service area restrictions.',
  },
  {
    slug: 'harbor-physical-therapy',
    name: 'Harbor Physical Therapy',
    archetype: 'Healthcare / Multi-Resource',
    description: 'Simultaneous resource allocation (Licensed Therapist + Private Treatment Room).',
  },
  {
    slug: 'mesa-auto-service',
    name: 'Mesa Auto Service',
    archetype: 'Automotive / Equipment',
    description: 'Multi-resource co-allocation (Certified Technician + Hydraulic Service Bay).',
  },
];

const ARCHITECTURE_LAYERS = [
  {
    icon: WrenchIcon,
    title: 'WebMCP Tool Layer',
    description:
      'Standardized browser-level tool registration exposing 8 deterministic functions with strict JSON schema definitions for agent discovery and execution.',
  },
  {
    icon: LayersIcon,
    title: 'Domain & Scheduling Engine',
    description:
      'Pure deterministic domain logic handling availability calculation, multi-resource constraints, service areas, and idempotent booking lifecycles.',
  },
  {
    icon: ServerIcon,
    title: 'Persistence Layer',
    description:
      'Production-ready PostgreSQL database with transaction isolation, row-level locking, and idempotent request logging via PlanetScale PgBouncer.',
  },
];

export default function HomePage() {
  return (
    <main className="container mx-auto flex-1 px-4 py-10 space-y-12">
      {/* Hero / Overview */}
      <section className="space-y-4 max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="inline-block size-2 rounded-full bg-emerald-500" />
          Core Infrastructure &amp; Reference Implementation
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Protocol Tooling
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Agent-native scheduling infrastructure for service businesses, exposed to personal AI agents through WebMCP.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button nativeButton={false} render={<Link href="/docs" />}>
            Explore WebMCP Tools
            <ArrowRightIcon className="size-4" />
          </Button>
          <Button variant="outline" nativeButton={false} render={<a href="https://github.com/robertonevarez/protocoltooling-demo" target="_blank" rel="noopener noreferrer" />}>
            Showcase &amp; Interactive Demo Repo
            <ArrowUpRightIcon className="size-4" />
          </Button>
        </div>
      </section>

      {/* Architecture Highlights */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Architecture &amp; Core Layers</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {ARCHITECTURE_LAYERS.map((layer) => {
            const Icon = layer.icon;
            return (
              <div key={layer.title} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="inline-flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-semibold text-foreground">{layer.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{layer.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* WebMCP Registered Tools */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Standard WebMCP Tool Suite</h2>
            <p className="text-sm text-muted-foreground">
              Every business endpoint automatically registers these 8 tools with the agent runtime:
            </p>
          </div>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/docs" />}>
            Full Specifications &rarr;
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {WEBMCP_TOOL_NAMES.map((name) => (
            <div key={name} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono">
              <CheckCircle2Icon className="size-4 text-emerald-600 shrink-0" />
              <span className="truncate">{name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Reference Business Endpoints */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Reference Business Endpoints</h2>
          <p className="text-sm text-muted-foreground">
            Explore live reference business pages that register WebMCP tools in the page context.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SEEDED_BUSINESSES.map((b) => (
            <Link
              key={b.slug}
              href={`/businesses/${b.slug}`}
              className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/30 hover:bg-muted/30"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {b.archetype}
                </span>
                <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
              </div>
              <h3 className="mt-2 font-semibold text-foreground group-hover:underline">
                {b.name}
              </h3>
              <p className="mt-1 text-xs font-mono text-muted-foreground">
                /businesses/{b.slug}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {b.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Repositories Split Notice */}
      <section className="rounded-xl border border-border bg-muted/40 p-6 space-y-3">
        <h3 className="font-semibold text-foreground">Looking for the Showcase &amp; Interactive Demo?</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The public-facing marketing showcase, animated customer agent walkthrough, and visual debugger live in the dedicated repository:
        </p>
        <div>
          <Button variant="outline" size="sm" nativeButton={false} render={<a href="https://github.com/robertonevarez/protocoltooling-demo" target="_blank" rel="noopener noreferrer" />}>
            View robertonevarez/protocoltooling-demo
            <ArrowUpRightIcon className="size-3.5" />
          </Button>
        </div>
      </section>
    </main>
  );
}
