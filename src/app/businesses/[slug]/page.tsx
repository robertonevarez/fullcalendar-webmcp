import { notFound } from 'next/navigation';
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
      <main className="flex h-dvh w-full items-center justify-center p-6 sm:p-8 md:p-12 lg:p-16">
        <article className="flex h-full w-full max-w-6xl flex-col justify-between rounded-2xl md:rounded-3xl border border-border bg-card p-8 sm:p-10 md:p-12 lg:p-14 shadow-card">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              {business.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base md:text-lg">
              {business.address.city}, {business.address.region}
            </p>
          </div>
          <p className="mt-8 max-w-3xl text-base leading-relaxed text-foreground/80 sm:text-lg md:text-xl">
            {business.description}
          </p>
        </article>
      </main>
    </WebMCPBusinessProvider>
  );
}
