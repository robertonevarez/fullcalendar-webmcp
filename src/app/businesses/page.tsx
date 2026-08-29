import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { ArrowRightIcon, MapPinIcon, CheckCircle2Icon } from 'lucide-react';
import { bookingRepository } from '@/db/repository';
import { ensureDatabaseSeeded } from '@/db/init';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Business Directory | Protocol Tooling',
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
    <main className="mx-auto max-w-7xl p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Reference Directory
          </Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Business Endpoints
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Directory of {businessesWithServices.length} reference service businesses exposing full WebMCP tooling and scheduling infrastructure.
        </p>
      </div>

      {/* Grid with gap-6 and card p-6 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {businessesWithServices.map((b) => {
          const coverPhoto = b.photos?.[0]?.src ?? '/images/businesses/marias-cleaning/1.jpg';
          const objectPosition = b.photos?.[0]?.objectPosition ?? 'object-center';

          return (
            <Card
              key={b.slug}
              className="flex flex-col justify-between overflow-hidden transition-all hover:border-foreground/30 shadow-xs"
            >
              <div className="flex flex-col">
                {/* Image Cover */}
                <div className="relative aspect-16/9 w-full overflow-hidden bg-muted">
                  <Image
                    src={coverPhoto}
                    alt={b.name}
                    fill
                    unoptimized
                    className={`object-cover transition-transform duration-500 hover:scale-105 ${objectPosition}`}
                  />
                  <div className="absolute top-6 left-6">
                    <Badge variant="secondary" className="bg-black/65 text-white backdrop-blur-md border-white/10 text-[11px]">
                      {b.archetype}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <CardHeader className="p-6 gap-2">
                  <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
                    {b.name}
                  </CardTitle>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPinIcon className="size-3.5 shrink-0" />
                    <span>
                      {b.address.city}, {b.address.region}
                    </span>
                    <span>•</span>
                    <span className="font-mono">{b.timezone}</span>
                  </div>

                  <CardDescription className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {b.description}
                  </CardDescription>
                </CardHeader>

                {b.services.length > 0 && (
                  <CardContent className="px-6 pb-6 pt-0">
                    <div className="flex flex-wrap gap-2">
                      {b.services.slice(0, 3).map((s) => (
                        <Badge
                          key={s.id}
                          variant="ghost"
                          className="gap-1 text-[11px] font-normal"
                        >
                          <CheckCircle2Icon className="size-3 text-emerald-600" />
                          {s.name}
                        </Badge>
                      ))}
                      {b.services.length > 3 && (
                        <Badge variant="ghost" className="text-[11px] font-normal text-muted-foreground">
                          +{b.services.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                )}
              </div>

              {/* Action */}
              <CardFooter className="border-t border-border/60 bg-muted/20 p-6 flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground truncate max-w-[55%]">
                  /businesses/{b.slug}
                </span>
                <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs cursor-pointer" nativeButton={false} render={<Link href={`/businesses/${b.slug}`} />}>
                  Navigate
                  <ArrowRightIcon className="size-3.5" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
