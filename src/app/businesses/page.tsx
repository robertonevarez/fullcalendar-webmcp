import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { ArrowRightIcon, MapPinIcon, SparklesIcon, CheckCircle2Icon } from 'lucide-react';
import { bookingRepository } from '@/db/repository';
import { ensureDatabaseSeeded } from '@/db/init';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Business Directory (Private)',
  robots: {
    index: false,
    follow: false,
  },
};

const ARCHETYPE_MAP: Record<string, string> = {
  'marias-cleaning': 'Residential Cleaning / Field Service',
  'acme-hvac': 'Field Service / HVAC',
  'blue-pipe-plumbing': 'Field Service / Plumbing',
  'northline-salon': 'Personal Care / Stylist',
  'harbor-physical-therapy': 'Healthcare / Multi-Resource',
  'mesa-auto-service': 'Automotive / Equipment',
};

export default async function BusinessesDirectoryPage() {
  await ensureDatabaseSeeded();
  const businesses = await bookingRepository.listBusinesses();

  const businessesWithServices = await Promise.all(
    businesses.map(async (b) => {
      const services = await bookingRepository.listServices(b.id);
      return {
        ...b,
        services,
        archetype: ARCHETYPE_MAP[b.slug] ?? 'Service Business',
      };
    }),
  );

  return (
    <main className="container mx-auto flex-1 px-4 py-10 space-y-10 max-w-6xl">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          <SparklesIcon className="size-3.5 text-amber-500" />
          Private Reference Directory
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Business Endpoints
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl">
          Quick-navigation directory for all {businessesWithServices.length} reference service businesses. Each endpoint exposes the full 8-tool WebMCP suite and dynamic card layout.
        </p>
      </div>

      {/* Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {businessesWithServices.map((b) => {
          const coverPhoto = b.photos?.[0]?.src ?? '/images/businesses/marias-cleaning/1.jpg';
          const objectPosition = b.photos?.[0]?.objectPosition ?? 'object-center';

          return (
            <div
              key={b.slug}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition-all hover:border-foreground/30 hover:shadow-md"
            >
              <div>
                {/* Image Cover */}
                <div className="relative aspect-16/9 w-full overflow-hidden bg-muted">
                  <Image
                    src={coverPhoto}
                    alt={b.name}
                    fill
                    unoptimized
                    className={`object-cover transition-transform duration-500 group-hover:scale-105 ${objectPosition}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <span className="absolute bottom-2.5 left-3 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[11px] font-medium text-white/90">
                    {b.archetype}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                      {b.name}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPinIcon className="size-3.5 shrink-0" />
                    <span>
                      {b.address.city}, {b.address.region}
                    </span>
                    <span className="text-border">•</span>
                    <span className="font-mono">{b.timezone}</span>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {b.description}
                  </p>

                  {/* Services summary */}
                  {b.services.length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-1.5">
                      {b.services.slice(0, 3).map((s) => (
                        <span
                          key={s.id}
                          className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                        >
                          <CheckCircle2Icon className="size-2.5 text-emerald-600" />
                          {s.name}
                        </span>
                      ))}
                      {b.services.length > 3 && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                          +{b.services.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="border-t border-border/60 bg-muted/20 px-5 py-3 flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">
                  /businesses/{b.slug}
                </span>
                <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" nativeButton={false} render={<Link href={`/businesses/${b.slug}`} />}>
                  Navigate
                  <ArrowRightIcon className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
