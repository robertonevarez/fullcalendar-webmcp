import { CheckIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import { CardPhotoBackground } from '@/components/card-photo-background';
import { Separator } from '@/components/ui/separator';
import { WebMCPBusinessProvider } from '@/components/webmcp-business-provider';
import { ensureDatabaseSeeded } from '@/db/init';
import { bookingRepository } from '@/db/repository';

export const dynamic = 'force-dynamic';

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
    title: business.name,
    description: business.description,
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
  const serviceNames = services.map((service) => service.name);

  return (
    <WebMCPBusinessProvider businessSlug={business.slug} businessName={business.name}>
      <main className="flex h-dvh w-full items-center justify-center p-5 sm:p-7 md:p-10 lg:p-14">
        <div className="relative h-full w-full max-w-6xl card-drop-shadow">
          <article className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[2rem] md:rounded-[2.75rem] smooth-corners isolate p-6 sm:p-8 md:p-9 lg:p-10">
            <CardPhotoBackground slug={business.slug} />
            <div className="relative z-10 flex w-full items-baseline justify-between gap-3 text-base font-medium tracking-tight text-white sm:text-lg md:text-xl [filter:drop-shadow(0_1px_3px_rgba(0,0,0,0.85))_drop-shadow(0_2px_10px_rgba(0,0,0,0.55))]">
              <h1 className="min-w-0 truncate">{business.name}</h1>
              <p className="max-w-[45%] shrink-0 truncate text-right">
                {business.address.city}, {business.address.region}
              </p>
            </div>
            <div className="relative z-10 flex w-full flex-col gap-2 [filter:drop-shadow(0_1px_3px_rgba(0,0,0,0.85))_drop-shadow(0_2px_10px_rgba(0,0,0,0.55))]">
              <p className="line-clamp-3 text-sm font-medium leading-snug tracking-tight text-white sm:text-base md:text-lg">
                {business.description}
              </p>
              {serviceNames.length > 0 ? (
                <>
                  <Separator className="bg-white/30" />
                  <ul className="flex min-w-0 flex-wrap gap-x-6 gap-y-2.5 text-sm font-medium tracking-tight text-white/80 sm:gap-x-8 sm:text-base md:text-lg">
                    {serviceNames.map((name) => (
                      <li key={name} className="flex min-w-0 items-center gap-1.5">
                        <CheckIcon className="size-3.5 shrink-0 sm:size-4" aria-hidden />
                        <span className="truncate">{name}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </article>
        </div>
      </main>
    </WebMCPBusinessProvider>
  );
}
