import Link from 'next/link';
import { ArrowRightIcon, ArrowUpRightIcon, CheckCircle2Icon, LayersIcon, ServerIcon, WrenchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { WEBMCP_TOOL_NAMES } from '@/webmcp/tools';

const SEEDED_BUSINESSES = [
  {
    slug: 'marias-cleaning',
    name: "Maria's Cleaning Service",
    archetype: 'Residential Cleaning / Field Service',
    description: 'WebMCP reference fixture in El Paso, TX with territory validation, deep clean constraints, and live scheduling.',
  },
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
      'Production-ready PostgreSQL database with transaction isolation, row-level locking, and idempotent request logging.',
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl p-6 flex flex-col gap-6">
      {/* Hero */}
      <section className="flex flex-col gap-3 max-w-3xl">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 text-xs">
            <span className="size-2 rounded-full bg-emerald-500" />
            Core Infrastructure &amp; Reference Implementation
          </Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Protocol Tooling
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          Agent-native scheduling infrastructure for service businesses, exposed to personal AI agents through WebMCP.
        </p>
        <div className="flex flex-wrap items-center gap-6 pt-2">
          <Button nativeButton={false} render={<Link href="/businesses" />}>
            Explore Business Directory
            <ArrowRightIcon className="size-4" />
          </Button>
          <Button variant="outline" nativeButton={false} render={<a href="https://github.com/robertonevarez/protocoltooling-demo" target="_blank" rel="noopener noreferrer" />}>
            Showcase Repo
            <ArrowUpRightIcon className="size-4" />
          </Button>
        </div>
      </section>

      {/* Architecture Highlights */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Architecture &amp; Core Layers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {ARCHITECTURE_LAYERS.map((layer) => {
            const Icon = layer.icon;
            return (
              <Card key={layer.title} className="p-6 flex flex-col gap-3">
                <div className="inline-flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon className="size-5" />
                </div>
                <CardTitle className="text-base font-semibold text-foreground">{layer.title}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground leading-relaxed">{layer.description}</CardDescription>
              </Card>
            );
          })}
        </div>
      </section>

      {/* WebMCP Registered Tools */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Standard WebMCP Tool Suite</h2>
            <p className="text-sm text-muted-foreground">
              Every business endpoint automatically registers these 8 tools with the agent runtime:
            </p>
          </div>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/businesses/marias-cleaning" />}>
            Live Reference Endpoint &rarr;
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {WEBMCP_TOOL_NAMES.map((name) => (
            <div key={name} className="flex items-center gap-2 rounded-lg border border-border bg-card p-6 text-sm font-mono">
              <CheckCircle2Icon className="size-4 text-emerald-600 shrink-0" />
              <span className="truncate">{name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Reference Business Endpoints */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Reference Business Endpoints</h2>
          <p className="text-sm text-muted-foreground">
            Explore live reference business pages that register WebMCP tools in the page context.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SEEDED_BUSINESSES.map((b) => (
            <Link
              key={b.slug}
              href={`/businesses/${b.slug}`}
              className="group"
            >
              <Card className="p-6 flex flex-col justify-between gap-3 h-full transition hover:border-foreground/30">
                <CardHeader className="p-0 gap-1.5">
                  <div className="flex items-center justify-between">
                    <Badge variant="ghost" className="text-[11px] uppercase tracking-wider">
                      {b.archetype}
                    </Badge>
                    <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                  </div>
                  <CardTitle className="text-base font-semibold text-foreground group-hover:underline">
                    {b.name}
                  </CardTitle>
                  <p className="text-xs font-mono text-muted-foreground">
                    /businesses/{b.slug}
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <CardDescription className="text-sm text-muted-foreground">
                    {b.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
