import { notFound } from 'next/navigation';
import { CardPhotoBackground } from '@/components/card-photo-background';
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

  return (
    <WebMCPBusinessProvider businessSlug={business.slug} businessName={business.name}>
      <main className="flex h-dvh w-full items-center justify-center p-5 sm:p-7 md:p-10 lg:p-14">
        <div className="relative h-full w-full max-w-6xl card-drop-shadow">
          <article className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[2rem] md:rounded-[2.75rem] smooth-corners isolate p-6 sm:p-8 md:p-9 lg:p-10">
            <CardPhotoBackground slug={business.slug} />
            <div className="relative z-10 max-w-2xl">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                {business.name}
              </h1>
              <p className="mt-1 text-xs font-medium text-white/90 sm:text-sm md:text-base drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
                {business.address.city}, {business.address.region}
              </p>
            </div>
            <p className="relative z-10 max-w-2xl text-sm leading-relaxed text-white/95 sm:text-base md:text-lg drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
              {business.description}
            </p>
          </article>
        </div>
      </main>
    </WebMCPBusinessProvider>
  );
}
