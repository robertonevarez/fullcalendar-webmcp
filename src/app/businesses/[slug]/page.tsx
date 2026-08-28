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
      <main className="grid min-h-dvh place-items-center bg-background px-6 py-8 sm:px-8">
        <article className="w-full max-w-[28rem] rounded-xl border border-border bg-card px-7 py-8 shadow-card sm:px-8 sm:py-9">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {business.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {business.address.city}, {business.address.region}
          </p>
          <p className="mt-7 text-base leading-7 text-foreground/80">
            {business.description}
          </p>
        </article>
      </main>
    </WebMCPBusinessProvider>
  );
}
